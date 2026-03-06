/**
 * Procedural World Generation Demo
 *
 * Demonstrates the plan-and-execute pattern for cost-efficient world generation.
 *
 * Cost Comparison:
 * - Sonnet-only: ~$0.15-0.30 per world
 * - Plan-and-Execute: ~$0.02-0.05 per world (80-90% cost reduction)
 */

import { HololandWorld } from '../src/HololandWorld';
import { ProceduralWorldOrchestrator } from '../src/procedural/ProceduralWorldOrchestrator';
import { NPCSystem } from '../src/systems/NPCSystem';
import { DialogManager } from '../src/managers/DialogManager';
import { HoloScriptLoader } from '../src/utils/HoloScriptLoader';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🌍 Procedural World Generation Demo\n');
  console.log('📊 Plan-and-Execute Pattern for 80-90% Cost Reduction\n');

  // Get API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: Set ANTHROPIC_API_KEY environment variable');
    process.exit(1);
  }

  // Initialize orchestrator
  const orchestrator = new ProceduralWorldOrchestrator({
    apiKey,
    designerModel: 'claude-sonnet-4-20250514', // Designer: Strategic planning
    builderModel: 'claude-haiku-4-20250514', // Builder: Fast execution
    trackCosts: true,
    verbose: true,
  });

  await orchestrator.initialize();
  console.log('✅ Orchestrator initialized\n');

  // Example world generation requests
  const examples = [
    {
      name: 'Office Space',
      request: {
        description: `Create a modern office space with:
- Open floor plan with desks and workstations
- Conference rooms and meeting areas
- Break room with seating and tables
- Reception area with waiting space
- Natural lighting from windows
- Plants and decorative elements`,
        metadata: {
          name: 'Modern Office',
          category: 'office' as const,
          size: 'medium' as const,
          complexity: 'moderate' as const,
          maxObjects: 50,
        },
        constraints: {
          performanceBudget: {
            maxDrawCalls: 100,
            targetFPS: 60,
          },
          accessibility: true,
          multiplayerOptimized: true,
        },
      },
    },
    {
      name: 'Art Gallery',
      request: {
        description: `Create an art gallery with:
- Large exhibition hall with high ceilings
- Wall-mounted paintings and sculptures on pedestals
- Proper gallery lighting (spotlights and ambient)
- Benches for viewing art
- Information plaques near artworks
- Minimalist design focusing on the art`,
        metadata: {
          name: 'Contemporary Art Gallery',
          category: 'gallery' as const,
          size: 'large' as const,
          complexity: 'simple' as const,
          maxObjects: 40,
        },
        constraints: {
          performanceBudget: {
            maxDrawCalls: 80,
            targetFPS: 90,
          },
          accessibility: true,
        },
      },
    },
    {
      name: 'City Park',
      request: {
        description: `Create a peaceful city park with:
- Walking paths and benches
- Trees, bushes, and flowers
- Central fountain or monument
- Playground area with equipment
- Pond with bridge
- Picnic areas with tables
- Ambient nature sounds`,
        metadata: {
          name: 'Central Park',
          category: 'nature' as const,
          size: 'large' as const,
          complexity: 'complex' as const,
          maxObjects: 80,
        },
        constraints: {
          performanceBudget: {
            maxDrawCalls: 150,
            targetFPS: 60,
          },
          multiplayerOptimized: true,
        },
      },
    },
    {
      name: 'Physics Playground',
      request: {
        description: `Create an interactive physics playground with:
- Large platform with boundaries
- Various shapes: cubes, spheres, cylinders
- Ramps and inclines for rolling objects
- Towers and stacking structures
- Interactive elements that can be grabbed and thrown
- Color-coded zones for different physics types`,
        metadata: {
          name: 'Physics Lab',
          category: 'playground' as const,
          size: 'medium' as const,
          complexity: 'moderate' as const,
          maxObjects: 60,
        },
        constraints: {
          performanceBudget: {
            maxDrawCalls: 120,
            targetFPS: 60,
          },
          multiplayerOptimized: true,
        },
      },
    },
  ];

  // Select example to generate (from command line argument)
  const exampleIndex = parseInt(process.argv[2] || '0');
  const example = examples[exampleIndex] || examples[0];

  console.log(`📝 Generating: ${example.name}\n`);
  console.log(`Description: ${example.request.description.substring(0, 100)}...\n`);

  // COST ESTIMATION
  console.log('💰 Cost Estimation:\n');
  const estimate = orchestrator.estimateCostComparison(example.request.description);
  console.log(`  Sonnet-only approach:     $${estimate.sonnetOnly.toFixed(4)}`);
  console.log(`  Plan-and-Execute:         $${estimate.planAndExecute.toFixed(4)}`);
  console.log(`  💵 Savings:               $${estimate.savings.toFixed(4)} (${estimate.savingsPercent.toFixed(1)}%)\n`);

  // WORLD GENERATION
  console.log('🚀 Starting generation...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();
  const result = await orchestrator.generateWorld(example.request);
  const totalTime = Date.now() - startTime;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!result.success) {
    console.error('❌ Generation failed:', result.errors);
    process.exit(1);
  }

  console.log('✅ Generation complete!\n');

  // RESULTS SUMMARY
  console.log('📊 Generation Summary:\n');
  console.log(`  Status:                   ${result.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`  Total Time:               ${totalTime}ms`);
  console.log(`  Objects Generated:        ${result.metrics.objectsGenerated}`);
  console.log(`  Lines of Code:            ${result.metrics.linesOfCode}`);
  console.log();

  // PHASE BREAKDOWN
  console.log('⏱️  Phase Breakdown:\n');
  console.log(`  Planning (Designer):      ${result.metrics.planningTimeMs}ms`);
  console.log(`  Building (Builder):       ${result.metrics.buildingTimeMs}ms`);
  console.log(`  Review (Designer):        ${result.metrics.reviewTimeMs}ms`);
  console.log();

  // COST BREAKDOWN
  console.log('💰 Actual Cost Breakdown:\n');
  console.log(`  Designer (Sonnet):        $${result.costs.designerCost.toFixed(4)} (${result.costs.tokensUsed.designer} tokens)`);
  console.log(`  Builder (Haiku):          $${result.costs.builderCost.toFixed(4)} (${result.costs.tokensUsed.builder} tokens)`);
  console.log(`  Review (Sonnet):          $${result.costs.reviewCost.toFixed(4)} (${result.costs.tokensUsed.review} tokens)`);
  console.log(`  ────────────────────────────────────────────────────`);
  console.log(`  Total Cost:               $${result.costs.totalCost.toFixed(4)} (${result.costs.tokensUsed.total} tokens)`);
  console.log();

  // SAVINGS COMPARISON
  const actualSonnetOnlyCost = estimate.sonnetOnly;
  const actualSavings = actualSonnetOnlyCost - result.costs.totalCost;
  const actualSavingsPercent = (actualSavings / actualSonnetOnlyCost) * 100;

  console.log('📈 Cost Comparison (Actual):\n');
  console.log(`  Sonnet-only (estimated):  $${actualSonnetOnlyCost.toFixed(4)}`);
  console.log(`  Plan-and-Execute (actual): $${result.costs.totalCost.toFixed(4)}`);
  console.log(`  💵 Savings:               $${actualSavings.toFixed(4)} (${actualSavingsPercent.toFixed(1)}%)`);
  console.log();

  // WORLD PLAN
  console.log('🗺️  World Plan:\n');
  console.log(`  Concept:                  ${result.plan.concept}`);
  console.log(`  Zones:                    ${result.plan.zones.length}`);
  result.plan.zones.forEach((zone, i) => {
    console.log(`    ${i + 1}. ${zone.name} - ${zone.purpose}`);
  });
  console.log(`  Landmarks:                ${result.plan.landmarks.length}`);
  result.plan.landmarks.forEach((landmark, i) => {
    console.log(`    ${i + 1}. ${landmark.name} (${landmark.type}) - ${landmark.prominence} prominence`);
  });
  console.log(`  Layout Pattern:           ${result.plan.layout.pattern}`);
  console.log(`  Materials:                ${result.plan.materials.primary} (primary), ${result.plan.materials.skybox} skybox`);
  console.log();

  // DESIGNER REVIEW
  if (result.review) {
    console.log('👀 Designer Review:\n');
    console.log(`  Rating:                   ${result.review.rating.toUpperCase()}`);
    console.log(`  Strengths:                ${result.review.strengths.length}`);
    result.review.strengths.forEach((strength, i) => {
      console.log(`    ✅ ${strength}`);
    });
    if (result.review.improvements.length > 0) {
      console.log(`  Improvements:             ${result.review.improvements.length}`);
      result.review.improvements.forEach((improvement, i) => {
        console.log(`    ⚠️  ${improvement}`);
      });
    }
    console.log(`  Refinement Needed:        ${result.review.refinementNeeded ? 'Yes' : 'No'}`);
    console.log();
  }

  // SAVE RESULTS
  const outputDir = join(process.cwd(), 'output', 'procedural-worlds');
  mkdirSync(outputDir, { recursive: true });

  const worldFilename = `${example.name.toLowerCase().replace(/\s+/g, '-')}.holo`;
  const worldPath = join(outputDir, worldFilename);
  writeFileSync(worldPath, result.holoScript);

  const reportFilename = `${example.name.toLowerCase().replace(/\s+/g, '-')}-report.json`;
  const reportPath = join(outputDir, reportFilename);
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        name: example.name,
        request: example.request,
        result: {
          plan: result.plan,
          review: result.review,
          costs: result.costs,
          metrics: result.metrics,
          executionSteps: result.executionSteps,
        },
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log('💾 Saved Files:\n');
  console.log(`  HoloScript:               ${worldPath}`);
  console.log(`  Report:                   ${reportPath}`);
  console.log();

  // LOAD INTO HOLOLAND (optional)
  if (process.argv.includes('--load')) {
    console.log('🌍 Loading into HololandWorld...\n');

    const world = new HololandWorld({
      name: example.request.metadata?.name || 'Generated World',
      enablePhysics: true,
      bounds: {
        min: { x: -100, y: -100, z: -100 },
        max: { x: 100, y: 100, z: 100 },
      },
    });

    const npcSystem = new NPCSystem();
    const dialogManager = new DialogManager();
    const loader = new HoloScriptLoader(npcSystem, dialogManager);

    try {
      loader.load(result.holoScript);
      world.start();

      console.log('✅ World loaded successfully\n');

      const state = world.getState();
      console.log('📊 World State:');
      console.log(`  Name:                     ${state.name}`);
      console.log(`  Objects:                  ${state.totalObjects}`);
      console.log(`  Uptime:                   ${state.uptime}ms\n`);

      // Run simulation for 5 seconds
      console.log('⏱️  Running simulation for 5 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));

      world.stop();
      console.log('✅ Simulation stopped\n');
    } catch (error: any) {
      console.error('❌ Failed to load world:', error.message);
    }
  }

  console.log('🎉 Demo complete!\n');
  console.log('Next steps:');
  console.log(`  1. Review generated HoloScript: ${worldPath}`);
  console.log(`  2. Check detailed report: ${reportPath}`);
  console.log('  3. Compile to target platform (Unity, Unreal, WebXR)');
  console.log('  4. Experience in VR!\n');
  console.log('Try other examples:');
  console.log('  npm run demo:procedural 0  # Office Space');
  console.log('  npm run demo:procedural 1  # Art Gallery');
  console.log('  npm run demo:procedural 2  # City Park');
  console.log('  npm run demo:procedural 3  # Physics Playground\n');
}

main().catch(console.error);
