/**
 * Quality Profile Integration Example
 *
 * Demonstrates how to integrate quality profiles with HololandRenderer
 * and apply settings from HoloScript composition metadata.
 */

import { HololandRenderer } from '@hololand/renderer';
import {
  QualityProfileManager,
  createQualityProfileManager,
  QUALITY_PROFILES,
  type CompositionQualityMetadata,
} from '@hololand/quality-profiles';

// =============================================================================
// EXAMPLE 1: Basic Integration
// =============================================================================

export function example1_basicIntegration() {
  console.log('=== Example 1: Basic Integration ===\n');

  // Create quality profile manager
  const profileManager = new QualityProfileManager({
    defaultProfile: 'industrial',
    autoApply: true,
  });

  console.log('Current profile:', profileManager.getProfile().displayName);
  console.log('Priority:', profileManager.getEffectivePriority());
  console.log('Summary:', profileManager.getProfileSummary());

  // Get effective settings
  const settings = profileManager.getEffectiveQualitySettings();
  console.log('\nRender settings:');
  console.log('  Shadow map size:', settings.shadowMapSize);
  console.log('  Max texture size:', settings.maxTextureSize);
  console.log('  Target FPS:', settings.targetFPS);
  console.log('  Post-processing:', settings.postProcessing);

  // Get trait configuration
  const traitConfig = profileManager.getEffectiveTraitConfig();
  console.log('\nTrait configuration:');
  console.log('  Physics accuracy:', traitConfig.physics?.accuracy);
  console.log('  Physics substeps:', traitConfig.physics?.substeps);
  console.log('  Network sync rate:', traitConfig.networking?.syncRate);
}

// =============================================================================
// EXAMPLE 2: Renderer Integration
// =============================================================================

export function example2_rendererIntegration(
  canvas: HTMLCanvasElement,
  world: any
) {
  console.log('=== Example 2: Renderer Integration ===\n');

  // Create profile manager with renderer callback
  const profileManager = new QualityProfileManager({
    defaultProfile: 'cinematic',
    onProfileChange: (profile, metadata) => {
      console.log(`Profile changed to: ${profile.displayName}`);

      // Apply settings to renderer
      const settings = profileManager.getEffectiveQualitySettings();
      renderer.getQualityManager().applyOverrides(settings);
    },
    onTraitConfigChange: (traitConfig) => {
      console.log('Trait config updated');
      // Apply to physics engine, network manager, etc.
    },
  });

  // Create renderer
  const renderer = new HololandRenderer(canvas, world, {
    quality: 'auto', // Will be overridden by profile
  });

  // Apply initial profile settings
  const initialSettings = profileManager.getEffectiveQualitySettings();
  renderer.getQualityManager().applyOverrides(initialSettings);

  console.log('Renderer initialized with cinematic profile');

  return { renderer, profileManager };
}

// =============================================================================
// EXAMPLE 3: Composition Metadata Application
// =============================================================================

export function example3_compositionMetadata() {
  console.log('=== Example 3: Composition Metadata ===\n');

  const profileManager = new QualityProfileManager();

  // Simulate composition metadata from HoloScript
  const metadata: CompositionQualityMetadata = {
    profile: 'industrial',
    overrides: {
      targetFPS: 90, // Custom override
      shadowMapSize: 2048, // Better shadows
    },
    traitOverrides: {
      networking: {
        enabled: true,
        syncRate: 20, // Faster sync
        interpolation: true,
        compression: false,
      },
    },
  };

  // Validate metadata
  const validation = profileManager.validateMetadata(metadata);
  if (!validation.valid) {
    console.error('Metadata validation errors:', validation.errors);
    return;
  }

  console.log('Metadata is valid');

  // Apply metadata
  profileManager.applyFromMetadata(metadata);

  // Check effective settings
  const settings = profileManager.getEffectiveQualitySettings();
  console.log('\nEffective settings after metadata application:');
  console.log('  Target FPS:', settings.targetFPS); // 90 (overridden)
  console.log('  Shadow map size:', settings.shadowMapSize); // 2048 (overridden)
  console.log('  Post-processing:', settings.postProcessing); // false (from profile)

  const traitConfig = profileManager.getEffectiveTraitConfig();
  console.log('\nEffective trait config:');
  console.log('  Network sync rate:', traitConfig.networking?.syncRate); // 20 (overridden)
  console.log('  Network compression:', traitConfig.networking?.compression); // false (overridden)
}

// =============================================================================
// EXAMPLE 4: Profile Recommendation
// =============================================================================

export function example4_profileRecommendation(renderer: HololandRenderer) {
  console.log('=== Example 4: Profile Recommendation ===\n');

  const profileManager = new QualityProfileManager();

  // Method 1: By device type
  const deviceType = renderer.getQualityManager().getDeviceType();
  const recommendedByDevice = profileManager.recommendProfileByDevice(deviceType);
  console.log('Device type:', deviceType);
  console.log('Recommended profile by device:', recommendedByDevice);

  // Method 2: By use case tags
  const tags = ['digital-twin', 'iot', 'precision'];
  const recommendedByTags = profileManager.recommendProfileByTags(tags);
  console.log('\nUse case tags:', tags);
  console.log('Recommended profile by tags:', recommendedByTags);

  // Method 3: By rendering priority
  const priority = 'visual-fidelity';
  const recommendedByPriority = profileManager.recommendProfileByPriority(priority);
  console.log('\nRendering priority:', priority);
  console.log('Recommended profile by priority:', recommendedByPriority);

  // Apply recommended profile
  profileManager.setProfile(recommendedByDevice);
  console.log('\nApplied profile:', profileManager.getProfile().displayName);
}

// =============================================================================
// EXAMPLE 5: Device-Specific Profile Adjustment
// =============================================================================

export function example5_deviceSpecificAdjustment(renderer: HololandRenderer) {
  console.log('=== Example 5: Device-Specific Adjustment ===\n');

  const profileManager = new QualityProfileManager();
  const deviceType = renderer.getQualityManager().getDeviceType();
  const gpuTier = renderer.getQualityManager().getGPUInfo().tier;

  console.log('Device:', deviceType);
  console.log('GPU tier:', gpuTier);

  // Smart profile selection with device-specific overrides
  if (deviceType === 'quest2') {
    console.log('\nApplying Quest 2 optimizations...');
    profileManager.applyFromMetadata({
      profile: 'mobile',
      overrides: {
        targetFPS: 72,
        pixelRatio: 0.75,
        maxTextureSize: 512,
      },
    });
  } else if (deviceType === 'quest3' || deviceType === 'questPro') {
    console.log('\nApplying Quest 3/Pro optimizations...');
    profileManager.applyFromMetadata({
      profile: 'mobile',
      overrides: {
        targetFPS: 90, // Quest 3 supports 90Hz
        pixelRatio: 1.0, // Better display
        maxTextureSize: 1024, // Can handle higher
      },
    });
  } else if (deviceType === 'pcvr' || deviceType === 'desktop') {
    console.log('\nApplying PC VR/Desktop optimizations...');
    if (gpuTier === 'high' || gpuTier === 'ultra') {
      profileManager.setProfile('cinematic');
    } else {
      profileManager.setProfile('industrial');
    }
  } else {
    console.log('\nApplying fallback mobile profile...');
    profileManager.setProfile('mobile');
  }

  const summary = profileManager.getProfileSummary();
  console.log('\nFinal configuration:', summary);
}

// =============================================================================
// EXAMPLE 6: Profile Comparison
// =============================================================================

export function example6_profileComparison() {
  console.log('=== Example 6: Profile Comparison ===\n');

  const profileManager = new QualityProfileManager();

  // Compare all profiles
  const profiles: Array<[string, string]> = [
    ['industrial', 'cinematic'],
    ['industrial', 'mobile'],
    ['cinematic', 'mobile'],
  ];

  profiles.forEach(([a, b]) => {
    console.log(`\nComparing ${a} vs ${b}:`);
    const diffs = profileManager.compareProfiles(a as any, b as any);
    diffs.forEach((diff) => console.log('  -', diff));
  });

  // Display summaries
  console.log('\n\nProfile Summaries:');
  console.log('Industrial:', profileManager.getProfileSummary('industrial'));
  console.log('Cinematic:', profileManager.getProfileSummary('cinematic'));
  console.log('Mobile:', profileManager.getProfileSummary('mobile'));
}

// =============================================================================
// EXAMPLE 7: Runtime Profile Switching
// =============================================================================

export function example7_runtimeSwitching(renderer: HololandRenderer) {
  console.log('=== Example 7: Runtime Profile Switching ===\n');

  const profileManager = new QualityProfileManager({
    defaultProfile: 'industrial',
    onProfileChange: (profile) => {
      console.log(`Switched to ${profile.displayName} profile`);
      const settings = profileManager.getEffectiveQualitySettings();
      renderer.getQualityManager().applyOverrides(settings);
    },
  });

  // Simulate user quality preference change
  const userQualityPreference = (quality: 'low' | 'medium' | 'high') => {
    console.log(`\nUser selected quality: ${quality}`);

    const profileMap = {
      low: 'mobile',
      medium: 'industrial',
      high: 'cinematic',
    } as const;

    profileManager.setProfile(profileMap[quality]);
  };

  // Try different quality levels
  userQualityPreference('low');
  userQualityPreference('medium');
  userQualityPreference('high');

  // Simulate performance-based auto-adjustment
  const autoAdjustForPerformance = (currentFPS: number) => {
    const currentProfile = profileManager.getProfile();
    const targetFPS = currentProfile.renderSettings.targetFPS;

    console.log(`\nCurrent FPS: ${currentFPS}, Target: ${targetFPS}`);

    if (currentFPS < targetFPS * 0.8) {
      console.log('Performance low, downgrading quality...');

      if (currentProfile.name === 'cinematic') {
        profileManager.setProfile('industrial');
      } else if (currentProfile.name === 'industrial') {
        profileManager.setProfile('mobile');
      } else {
        console.log('Already at minimum quality (mobile)');
      }
    } else if (currentFPS > targetFPS * 1.3) {
      console.log('Performance excellent, upgrading quality...');

      if (currentProfile.name === 'mobile') {
        profileManager.setProfile('industrial');
      } else if (currentProfile.name === 'industrial') {
        profileManager.setProfile('cinematic');
      } else {
        console.log('Already at maximum quality (cinematic)');
      }
    } else {
      console.log('Performance stable, keeping current profile');
    }
  };

  // Simulate frame rate changes
  autoAdjustForPerformance(45); // Low FPS
  autoAdjustForPerformance(75); // Good FPS
}

// =============================================================================
// EXAMPLE 8: All Profiles Overview
// =============================================================================

export function example8_profilesOverview() {
  console.log('=== Example 8: All Profiles Overview ===\n');

  const profileManager = new QualityProfileManager();
  const allProfiles = profileManager.getAllProfiles();

  allProfiles.forEach((profile) => {
    console.log(`\n${profile.displayName.toUpperCase()} PROFILE`);
    console.log('━'.repeat(50));
    console.log('Priority:', profile.priority);
    console.log('Description:', profile.description);
    console.log('\nRender Settings:');
    console.log('  Shadow map size:', profile.renderSettings.shadowMapSize);
    console.log('  Max texture size:', profile.renderSettings.maxTextureSize);
    console.log('  Max poly count:', profile.renderSettings.maxPolyCount);
    console.log('  Target FPS:', profile.renderSettings.targetFPS);
    console.log('  Post-processing:', profile.renderSettings.postProcessing);
    console.log('\nPhysics:');
    console.log('  Accuracy:', profile.physicsAccuracy);
    console.log('  Substeps:', profile.traitConfig.physics?.substeps);
    console.log('  Collision:', profile.traitConfig.physics?.collisionDetection);
    console.log('\nNetworking:');
    console.log('  Sync rate:', profile.networkSyncRate, 'Hz');
    console.log('  Compression:', profile.traitConfig.networking?.compression);
    console.log('\nAudio:');
    console.log('  Quality:', profile.audioQuality);
    console.log('\nTags:', profile.tags.join(', '));
    console.log('\nRecommended devices:', profile.recommendedDevices?.join(', ') ?? 'Any');
  });
}

// =============================================================================
// MAIN DEMO
// =============================================================================

export function runAllExamples() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   QUALITY TIER PROFILES - INTEGRATION EXAMPLES            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Example 1: Basic integration
  example1_basicIntegration();

  console.log('\n');

  // Example 3: Composition metadata
  example3_compositionMetadata();

  console.log('\n');

  // Example 6: Profile comparison
  example6_profileComparison();

  console.log('\n');

  // Example 8: Profiles overview
  example8_profilesOverview();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   EXAMPLES COMPLETE                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
}

// Run examples if executed directly
if (typeof process !== 'undefined' && process.argv[1]?.includes('renderer-integration')) {
  runAllExamples();
}
