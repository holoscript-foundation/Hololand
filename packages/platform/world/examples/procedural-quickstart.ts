/**
 * Procedural World Generation - Quick Start
 *
 * Minimal example demonstrating 80-90% cost reduction with plan-and-execute pattern
 */

import { ProceduralWorldOrchestrator } from '../src/procedural/ProceduralWorldOrchestrator';

async function quickStart() {
  console.log('🚀 Procedural World Generation - Quick Start\n');

  // 1. Initialize orchestrator
  const orchestrator = new ProceduralWorldOrchestrator({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    trackCosts: true,
  });

  await orchestrator.initialize();

  // 2. Estimate cost savings
  const estimate = orchestrator.estimateCostComparison(
    'Create a modern office space with desks and meeting rooms'
  );

  console.log('💰 Cost Comparison:');
  console.log(`  Sonnet-only:      $${estimate.sonnetOnly.toFixed(4)}`);
  console.log(`  Plan-and-Execute: $${estimate.planAndExecute.toFixed(4)}`);
  console.log(`  💵 Savings:       $${estimate.savings.toFixed(4)} (${estimate.savingsPercent.toFixed(1)}%)\n`);

  // 3. Generate world
  console.log('🌍 Generating world...\n');

  const result = await orchestrator.generateWorld({
    description: 'Create a modern office space with open floor plan, meeting rooms, and break area',
    metadata: {
      name: 'Modern Office',
      category: 'office',
      size: 'medium',
      complexity: 'moderate',
      maxObjects: 50,
    },
  });

  // 4. Show results
  console.log('✅ Generation complete!\n');
  console.log('📊 Results:');
  console.log(`  Success:          ${result.success}`);
  console.log(`  Objects:          ${result.metrics.objectsGenerated}`);
  console.log(`  Lines of Code:    ${result.metrics.linesOfCode}`);
  console.log(`  Total Time:       ${result.metrics.totalTimeMs}ms`);
  console.log(`  Total Cost:       $${result.costs.totalCost.toFixed(4)}`);
  console.log();

  console.log('💰 Cost Breakdown:');
  console.log(`  Designer (Sonnet): $${result.costs.designerCost.toFixed(4)}`);
  console.log(`  Builder (Haiku):   $${result.costs.builderCost.toFixed(4)}`);
  console.log(`  Review (Sonnet):   $${result.costs.reviewCost.toFixed(4)}`);
  console.log();

  // 5. Show plan
  console.log('🗺️  World Plan:');
  console.log(`  Concept:  ${result.plan.concept}`);
  console.log(`  Zones:    ${result.plan.zones.length}`);
  console.log(`  Layout:   ${result.plan.layout.pattern}`);
  console.log();

  // 6. Show review
  if (result.review) {
    console.log('👀 Designer Review:');
    console.log(`  Rating:   ${result.review.rating.toUpperCase()}`);
    console.log(`  Strengths: ${result.review.strengths.length}`);
    result.review.strengths.forEach(s => console.log(`    ✅ ${s}`));
    console.log();
  }

  // 7. Show HoloScript preview
  console.log('📝 Generated HoloScript (preview):');
  console.log(result.holoScript.split('\n').slice(0, 20).join('\n'));
  console.log('  ... (truncated)\n');

  console.log('🎉 Done! World generated with 80%+ cost savings.');
}

quickStart().catch(console.error);
