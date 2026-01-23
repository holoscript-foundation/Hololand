/**
 * Demo 2: Voice Command → VR Pipeline
 * 
 * Shows voice command processing:
 * Voice Audio → Speech Recognition → HoloScript → R3F Components
 */

import { HololandAIBridge } from '@hololand/ai-bridge';

/**
 * Mock audio capture for demo purposes
 * In real VR app, this would be WebXR microphone input
 */
function mockAudioCapture(text: string): ArrayBuffer {
  // This is just a placeholder - in reality, you'd capture audio from mic
  const buffer = new ArrayBuffer(1024);
  console.log(`[MockAudio] Captured: "${text}"`);
  return buffer;
}

async function demo2VoiceCommand() {
  console.log('🎤 Demo 2: Voice Command → VR Pipeline\n');

  const bridge = new HololandAIBridge({
    enableVoice: true,
    enableCompilation: true,
    enableOptimization: true,
  });

  // Simulate voice commands
  const voiceCommands = [
    'create a coffee shop',
    'make it interactive',
    'add a menu board',
  ];

  for (const command of voiceCommands) {
    console.log(`\n🎵 Voice Command: "${command}"`);

    try {
      // In real VR app, this would be actual audio buffer from microphone
      const audioBuffer = mockAudioCapture(command);

      // Process voice (normally: speech → text → HoloScript → R3F)
      // For demo, we'll use direct translation since voice processor is mocked
      const result = await bridge.translateToHoloScript({
        naturalLanguage: command,
        context: {
          userLevel: 'beginner',
        },
      });

      console.log(`  ✅ Recognized: "${command}"`);
      console.log(`  📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);

      if (result.compilationResult?.success) {
        console.log(`  ✨ Compiled to R3F successfully`);
        console.log(`     Ready to render in ${result.compilationResult.metadata?.duration}ms`);
      } else {
        console.log(`  ⚠️  Compilation failed: ${result.compilationResult?.error}`);
      }

      // Display generated HoloScript for inspection
      console.log(`  📝 Generated HoloScript:`);
      const lines = result.holoScript?.split('\n') || [];
      lines.slice(0, 3).forEach(line => {
        if (line.trim()) console.log(`     ${line}`);
      });
      if (lines.length > 3) console.log(`     ... (${lines.length - 3} more lines)`);

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
}

// Run demo
demo2VoiceCommand().catch(console.error);
