
import { NaturalLanguageTranslator } from './packages/ai-bridge/src/NaturalLanguageTranslator';

async function testTranslation() {
  const translator = new NaturalLanguageTranslator();
  
  const prompts = [
    "Make a dense forest",
    "Add a goblin that throws rocks when I wave",
    "Add a troll which throws logs when I jump"
  ];

  for (const prompt of prompts) {
    console.log(`\n--- Prompt: "${prompt}" ---`);
    const result = await translator.translate(prompt);
    console.log("HoloScript Output:");
    console.log(result.holoScript);
    console.log(`Confidence: ${result.confidence}`);
  }
}

testTranslation().catch(console.error);
