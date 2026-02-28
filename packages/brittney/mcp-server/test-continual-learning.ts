import { describe, it, expect } from 'vitest';
import { handleContinualLearningTool } from './src/continual-learning';

async function runTests() {
   console.log("Running Multi-Modal Continual Learning Tests...");
   
   try {
       // Cache foundational early life memories aggressively
       for (let i = 0; i < 50; i++) {
           await handleContinualLearningTool('cache_experience', {
               eventId: `foundation_memory_${i}`,
               visualContext: ['critical_object', 'base_environment'],
               spatialContext: [],
               semanticContext: 'Early interaction forming base world model.',
               importanceScore: 90 + (Math.random() * 10) // High importance!
           });
       }
       console.log("✅ Seeded 50 foundational highly-important events.");

       // Introduce new noisy/low importance memories simulating dataset drift over time
       for(let i=0; i < 2000; i++) {
           await handleContinualLearningTool('cache_experience', {
               eventId: `noise_memory_${i}`,
               visualContext: ['sky', 'floor'],
               spatialContext: [],
               semanticContext: 'Idle, nothing happening.',
               importanceScore: Math.random() * 20 // Low importance
           });
       }
       console.log("✅ Seeded 2000 noisy events. Buffer should cull these successfully keeping foundational events safe.");
       
       // Simulate a sleep cycle ML Consolidation pass
       const newSensoryData = [
           { id: 'recent_1', type: 'novel_object' },
           { id: 'recent_2', type: 'novel_action' }
       ];
       
       const response: any = await handleContinualLearningTool('consolidate_memory_weights', {
           newBatchData: newSensoryData,
           historicalRatio: 0.5
       });

       console.log("Consolidation Payload Result:", response.content[0].text);
       
       if (!response.content[0].text.includes("Historical Replay Imprints: 2")) {
           throw new Error("Failed to map the 50% interleaved ratio exactly matching 2 output chunks.");
       }

       console.log("🎉 All Tests Successfully Passed!");
       process.exit(0);

   } catch(e) {
       console.error("Test failed:", e);
       process.exit(1);
   }
}

runTests();
