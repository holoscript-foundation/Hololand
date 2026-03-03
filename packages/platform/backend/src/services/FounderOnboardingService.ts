/**
 * Founder Onboarding Service
 *
 * Guided setup wizard state machine for new founders:
 *   1. welcome      -> Introduction to the Founders Program
 *   2. profile      -> Complete creator profile setup
 *   3. first_world  -> Template world provisioning (auto-fork)
 *   4. tutorial     -> Interactive HoloScript tutorial
 *   5. community    -> Join community channels, meet other founders
 *   6. complete     -> All steps done, founder fully onboarded
 *
 * Features:
 *   - State machine with validation at each transition
 *   - Template world provisioning (auto-fork from TemplateGallery's 8 templates)
 *   - Founder-exclusive asset grants (starter pack)
 *   - Integration with FoundersProgramService for status updates
 *
 * Follows the singleton + direct SQL pattern used by SubscriptionService
 * and CreditService for consistency.
 */

import { query } from '../db/pool';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorHandling';
import {
  type FounderOnboardingStep,
  type Founder,
  getFoundersProgramService,
} from './FoundersProgramService';

// ============================================================================
// Types
// ============================================================================

/**
 * Ordered list of onboarding steps.
 * The state machine enforces sequential progression.
 */
const ONBOARDING_STEPS: FounderOnboardingStep[] = [
  'welcome',
  'profile',
  'first_world',
  'tutorial',
  'community',
  'complete',
];

/**
 * Template definitions available for auto-fork during onboarding.
 * These correspond to TemplateGallery's 8 templates.
 */
export interface WorldTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  previewUrl: string;
  defaultConfig: Record<string, unknown>;
}

const TEMPLATE_GALLERY: WorldTemplate[] = [
  {
    id: 'blank-canvas',
    name: 'Blank Canvas',
    description: 'Empty world ready for your imagination',
    category: 'general',
    previewUrl: 'https://assets.hololand.io/templates/blank-canvas.png',
    defaultConfig: { maxObjects: 100, maxPlayers: 8, biome: 'plains' },
  },
  {
    id: 'gallery-space',
    name: 'Art Gallery',
    description: 'Curated exhibition space with lighting and display walls',
    category: 'art',
    previewUrl: 'https://assets.hololand.io/templates/gallery-space.png',
    defaultConfig: { maxObjects: 150, maxPlayers: 20, biome: 'custom', lighting: 'gallery' },
  },
  {
    id: 'social-hub',
    name: 'Social Hub',
    description: 'Community gathering space with seating, stages, and chat zones',
    category: 'social',
    previewUrl: 'https://assets.hololand.io/templates/social-hub.png',
    defaultConfig: { maxObjects: 200, maxPlayers: 50, biome: 'custom', voiceZones: true },
  },
  {
    id: 'learning-lab',
    name: 'Learning Lab',
    description: 'Interactive classroom with presentation areas and collaboration tools',
    category: 'education',
    previewUrl: 'https://assets.hololand.io/templates/learning-lab.png',
    defaultConfig: { maxObjects: 120, maxPlayers: 30, biome: 'custom', whiteboards: true },
  },
  {
    id: 'game-arena',
    name: 'Game Arena',
    description: 'Competitive arena with scoring, spawn points, and obstacle courses',
    category: 'game',
    previewUrl: 'https://assets.hololand.io/templates/game-arena.png',
    defaultConfig: { maxObjects: 250, maxPlayers: 16, biome: 'custom', scoring: true },
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Virtual storefront with product displays and transaction zones',
    category: 'commerce',
    previewUrl: 'https://assets.hololand.io/templates/marketplace.png',
    defaultConfig: { maxObjects: 180, maxPlayers: 40, biome: 'custom', commerce: true },
  },
  {
    id: 'nature-sanctuary',
    name: 'Nature Sanctuary',
    description: 'Procedurally generated natural environment with flora and fauna',
    category: 'experience',
    previewUrl: 'https://assets.hololand.io/templates/nature-sanctuary.png',
    defaultConfig: { maxObjects: 300, maxPlayers: 12, biome: 'forest', procedural: true },
  },
  {
    id: 'sci-fi-station',
    name: 'Sci-Fi Station',
    description: 'Futuristic space station with modular rooms and holographic displays',
    category: 'experience',
    previewUrl: 'https://assets.hololand.io/templates/sci-fi-station.png',
    defaultConfig: { maxObjects: 200, maxPlayers: 20, biome: 'crystal', holographic: true },
  },
];

/**
 * Starter pack assets granted to founders upon reaching the appropriate onboarding step.
 */
export interface StarterPackAsset {
  assetType: 'premium_asset' | 'exclusive_material' | 'badge_model';
  assetId: string;
  assetName: string;
}

const STARTER_PACK: StarterPackAsset[] = [
  // 10 Premium Assets
  { assetType: 'premium_asset', assetId: 'pa-hologram-display',    assetName: 'Hologram Display Panel' },
  { assetType: 'premium_asset', assetId: 'pa-neon-signage',        assetName: 'Neon Signage Kit' },
  { assetType: 'premium_asset', assetId: 'pa-floating-platform',   assetName: 'Floating Platform Set' },
  { assetType: 'premium_asset', assetId: 'pa-particle-emitter',    assetName: 'Particle Emitter Pack' },
  { assetType: 'premium_asset', assetId: 'pa-portal-gateway',      assetName: 'Portal Gateway' },
  { assetType: 'premium_asset', assetId: 'pa-ambient-soundscape',  assetName: 'Ambient Soundscape Collection' },
  { assetType: 'premium_asset', assetId: 'pa-terrain-sculpt-kit',  assetName: 'Terrain Sculpting Kit' },
  { assetType: 'premium_asset', assetId: 'pa-lighting-rig',        assetName: 'Professional Lighting Rig' },
  { assetType: 'premium_asset', assetId: 'pa-interactive-console', assetName: 'Interactive Console' },
  { assetType: 'premium_asset', assetId: 'pa-volumetric-cloud',    assetName: 'Volumetric Cloud System' },

  // 3 Exclusive Materials
  { assetType: 'exclusive_material', assetId: 'em-founder-gold',   assetName: 'Founder Gold Material' },
  { assetType: 'exclusive_material', assetId: 'em-holographic',    assetName: 'Holographic Shader Material' },
  { assetType: 'exclusive_material', assetId: 'em-aurora-glow',    assetName: 'Aurora Glow Material' },

  // 1 Founder Badge Model (varies by tier, but base model granted here)
  { assetType: 'badge_model', assetId: 'bm-founder-badge',         assetName: 'Founder Badge 3D Model' },
];

/**
 * Onboarding progress summary for a founder.
 */
export interface OnboardingProgress {
  founderId: string;
  userId: string;
  currentStep: FounderOnboardingStep;
  currentStepIndex: number;
  totalSteps: number;
  progressPercent: number;
  completedSteps: FounderOnboardingStep[];
  remainingSteps: FounderOnboardingStep[];
  isComplete: boolean;
  templateWorldsForked: number;
  assetsGranted: number;
}

// ============================================================================
// Service
// ============================================================================

export class FounderOnboardingService {
  private static instance: FounderOnboardingService;

  private constructor() {}

  public static getInstance(): FounderOnboardingService {
    if (!FounderOnboardingService.instance) {
      FounderOnboardingService.instance = new FounderOnboardingService();
    }
    return FounderOnboardingService.instance;
  }

  // --------------------------------------------------------------------------
  // State Machine
  // --------------------------------------------------------------------------

  /**
   * Get the current onboarding progress for a founder.
   */
  async getProgress(founderId: string): Promise<OnboardingProgress | null> {
    try {
      const foundersService = getFoundersProgramService();
      const founder = await foundersService.getFounderById(founderId);

      if (!founder) {
        return null;
      }

      const currentStepIndex = ONBOARDING_STEPS.indexOf(founder.onboardingStep);
      const completedSteps = ONBOARDING_STEPS.slice(0, currentStepIndex);
      const remainingSteps = ONBOARDING_STEPS.slice(currentStepIndex + 1);
      const isComplete = founder.onboardingStep === 'complete';

      // Count forked templates
      const { rows: templateRows } = await query(
        'SELECT COUNT(*) as count FROM founder_template_worlds WHERE founder_id = $1',
        [founderId]
      );

      // Count granted assets
      const { rows: assetRows } = await query(
        'SELECT COUNT(*) as count FROM founder_asset_grants WHERE founder_id = $1',
        [founderId]
      );

      return {
        founderId,
        userId: founder.userId,
        currentStep: founder.onboardingStep,
        currentStepIndex,
        totalSteps: ONBOARDING_STEPS.length,
        progressPercent: isComplete
          ? 100
          : Math.round((currentStepIndex / (ONBOARDING_STEPS.length - 1)) * 100),
        completedSteps,
        remainingSteps,
        isComplete,
        templateWorldsForked: parseInt(templateRows?.[0]?.count || '0', 10),
        assetsGranted: parseInt(assetRows?.[0]?.count || '0', 10),
      };
    } catch (error) {
      logger.error('[FounderOnboarding] Error getting progress:', getErrorMessage(error));
      return null;
    }
  }

  /**
   * Advance to the next onboarding step.
   * Validates that the founder is at the expected current step before advancing.
   * Triggers side effects for specific transitions (asset grants, template provisioning).
   */
  async advanceStep(founderId: string): Promise<OnboardingProgress | null> {
    try {
      const foundersService = getFoundersProgramService();
      const founder = await foundersService.getFounderById(founderId);

      if (!founder) {
        throw new Error('Founder not found');
      }

      if (founder.applicationStatus !== 'approved') {
        throw new Error('Founder must be approved to advance onboarding');
      }

      const currentIndex = ONBOARDING_STEPS.indexOf(founder.onboardingStep);

      if (currentIndex === -1) {
        throw new Error(`Invalid current onboarding step: ${founder.onboardingStep}`);
      }

      if (founder.onboardingStep === 'complete') {
        throw new Error('Onboarding already complete');
      }

      const nextStep = ONBOARDING_STEPS[currentIndex + 1];

      // Execute side effects for specific transitions
      await this.executeTransitionSideEffects(founder, founder.onboardingStep, nextStep);

      // Update the onboarding step
      const updateFields: string[] = [
        'onboarding_step = $1',
        'updated_at = NOW()',
      ];
      const params: any[] = [nextStep, founderId];

      if (nextStep === 'complete') {
        updateFields.push('onboarding_completed_at = NOW()');
      }

      await query(
        `UPDATE founders SET ${updateFields.join(', ')} WHERE id = $2`,
        params
      );

      logger.info(
        `[FounderOnboarding] Founder ${founderId} advanced: ${founder.onboardingStep} -> ${nextStep}`
      );

      return await this.getProgress(founderId);
    } catch (error) {
      logger.error('[FounderOnboarding] Error advancing step:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Reset onboarding to a specific step (admin operation).
   */
  async resetToStep(founderId: string, step: FounderOnboardingStep): Promise<OnboardingProgress | null> {
    try {
      if (!ONBOARDING_STEPS.includes(step)) {
        throw new Error(`Invalid onboarding step: ${step}`);
      }

      const updateFields = [
        'onboarding_step = $1',
        'updated_at = NOW()',
      ];

      if (step !== 'complete') {
        updateFields.push('onboarding_completed_at = NULL');
      }

      await query(
        `UPDATE founders SET ${updateFields.join(', ')} WHERE id = $2`,
        [step, founderId]
      );

      logger.info(`[FounderOnboarding] Founder ${founderId} reset to step: ${step}`);

      return await this.getProgress(founderId);
    } catch (error) {
      logger.error('[FounderOnboarding] Error resetting step:', getErrorMessage(error));
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Transition Side Effects
  // --------------------------------------------------------------------------

  /**
   * Execute side effects when transitioning between steps.
   */
  private async executeTransitionSideEffects(
    founder: Founder,
    fromStep: FounderOnboardingStep,
    toStep: FounderOnboardingStep
  ): Promise<void> {
    switch (toStep) {
      case 'first_world':
        // After profile setup, provision the first template world
        await this.provisionDefaultTemplateWorld(founder);
        break;

      case 'tutorial':
        // After first world creation, grant the starter pack
        await this.grantStarterPack(founder);
        break;

      case 'complete':
        // Final step: grant the badge model specific to their tier
        await this.grantTierBadgeModel(founder);
        break;

      default:
        // No side effects for other transitions
        break;
    }
  }

  // --------------------------------------------------------------------------
  // Template World Provisioning
  // --------------------------------------------------------------------------

  /**
   * Get available templates from the TemplateGallery.
   */
  getAvailableTemplates(): WorldTemplate[] {
    return [...TEMPLATE_GALLERY];
  }

  /**
   * Get a specific template by ID.
   */
  getTemplate(templateId: string): WorldTemplate | undefined {
    return TEMPLATE_GALLERY.find(t => t.id === templateId);
  }

  /**
   * Auto-fork a template world for a founder.
   * Creates a world record based on the template and associates it with the founder.
   */
  async forkTemplateWorld(founderId: string, templateId: string): Promise<string> {
    try {
      const template = this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template '${templateId}' not found`);
      }

      const foundersService = getFoundersProgramService();
      const founder = await foundersService.getFounderById(founderId);
      if (!founder) {
        throw new Error('Founder not found');
      }

      // Check if already forked this template
      const { rows: existing } = await query(
        `SELECT id FROM founder_template_worlds
         WHERE founder_id = $1 AND template_id = $2 LIMIT 1`,
        [founderId, templateId]
      );

      if (existing && existing.length > 0) {
        throw new Error(`Template '${templateId}' already forked for this founder`);
      }

      // Create the world record (references the worlds table from initial schema)
      // Look up the creator_profile for this user
      const { rows: profileRows } = await query(
        `SELECT id FROM creator_profiles WHERE user_id = $1 LIMIT 1`,
        [founder.userId]
      );

      let creatorProfileId: string;

      if (!profileRows || profileRows.length === 0) {
        // Auto-create a creator profile for the founder
        const { rows: newProfile } = await query(
          `INSERT INTO creator_profiles (user_id, display_name, description, verified)
           VALUES ($1, $2, $3, true)
           RETURNING id`,
          [
            founder.userId,
            `Founder #${founder.inviteCode || 'unknown'}`,
            'HoloLand Founder',
          ]
        );

        if (!newProfile || newProfile.length === 0) {
          throw new Error('Failed to create creator profile for founder');
        }
        creatorProfileId = newProfile[0].id;
      } else {
        creatorProfileId = profileRows[0].id;
      }

      // Create the world from template
      const { rows: worldRows } = await query(
        `INSERT INTO worlds (
          creator_id, title, description, category,
          data, published, max_objects, max_players
        )
        VALUES ($1, $2, $3, $4, $5, false, $6, $7)
        RETURNING id`,
        [
          creatorProfileId,
          `${template.name} (Founder Copy)`,
          template.description,
          template.category,
          JSON.stringify({
            templateId: template.id,
            templateConfig: template.defaultConfig,
            forkedAt: new Date().toISOString(),
            founderCopy: true,
          }),
          template.defaultConfig.maxObjects || 100,
          template.defaultConfig.maxPlayers || 8,
        ]
      );

      if (!worldRows || worldRows.length === 0) {
        throw new Error('Failed to create world from template');
      }

      const worldId = worldRows[0].id;

      // Record the fork
      await query(
        `INSERT INTO founder_template_worlds (founder_id, template_id, world_id)
         VALUES ($1, $2, $3)`,
        [founderId, templateId, worldId]
      );

      logger.info(
        `[FounderOnboarding] Template '${templateId}' forked for founder ${founderId} -> world ${worldId}`
      );

      return worldId;
    } catch (error) {
      logger.error('[FounderOnboarding] Error forking template world:', getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Provision the default template world during onboarding.
   * Auto-forks the 'blank-canvas' template as the founder's first world.
   */
  private async provisionDefaultTemplateWorld(founder: Founder): Promise<void> {
    try {
      await this.forkTemplateWorld(founder.id, 'blank-canvas');
      logger.info(`[FounderOnboarding] Default template world provisioned for founder ${founder.id}`);
    } catch (error) {
      // Log but don't block onboarding progression
      logger.warn(
        `[FounderOnboarding] Failed to provision default template for founder ${founder.id}: ` +
        getErrorMessage(error)
      );
    }
  }

  /**
   * Get all template worlds forked by a founder.
   */
  async getForkedWorlds(founderId: string): Promise<Array<{
    templateId: string;
    worldId: string;
    forkedAt: Date;
    template: WorldTemplate | undefined;
  }>> {
    try {
      const { rows } = await query(
        `SELECT template_id, world_id, forked_at
         FROM founder_template_worlds
         WHERE founder_id = $1
         ORDER BY forked_at ASC`,
        [founderId]
      );

      return (rows || []).map((row: any) => ({
        templateId: row.template_id,
        worldId: row.world_id,
        forkedAt: new Date(row.forked_at),
        template: this.getTemplate(row.template_id),
      }));
    } catch (error) {
      logger.error('[FounderOnboarding] Error getting forked worlds:', getErrorMessage(error));
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Asset Grants (Starter Pack)
  // --------------------------------------------------------------------------

  /**
   * Grant the full starter pack to a founder.
   * Includes: 10 premium assets, 3 exclusive materials, 1 founder badge model.
   */
  async grantStarterPack(founder: Founder): Promise<number> {
    try {
      let grantedCount = 0;

      for (const asset of STARTER_PACK) {
        try {
          await this.grantAsset(founder.id, asset);
          grantedCount++;
        } catch (err) {
          // Skip already-granted assets (UNIQUE constraint)
          const msg = getErrorMessage(err);
          if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already')) {
            logger.debug(
              `[FounderOnboarding] Asset ${asset.assetId} already granted to founder ${founder.id}`
            );
          } else {
            logger.warn(
              `[FounderOnboarding] Failed to grant asset ${asset.assetId} to founder ${founder.id}: ${msg}`
            );
          }
        }
      }

      logger.info(
        `[FounderOnboarding] Starter pack granted to founder ${founder.id}: ${grantedCount}/${STARTER_PACK.length} assets`
      );

      return grantedCount;
    } catch (error) {
      logger.error('[FounderOnboarding] Error granting starter pack:', getErrorMessage(error));
      return 0;
    }
  }

  /**
   * Grant a single asset to a founder.
   */
  private async grantAsset(founderId: string, asset: StarterPackAsset): Promise<void> {
    await query(
      `INSERT INTO founder_asset_grants (founder_id, asset_type, asset_id, asset_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (founder_id, asset_id) DO NOTHING`,
      [founderId, asset.assetType, asset.assetId, asset.assetName]
    );
  }

  /**
   * Grant the tier-specific badge 3D model.
   * Called when onboarding completes.
   */
  private async grantTierBadgeModel(founder: Founder): Promise<void> {
    try {
      const tier = founder.badgeTier || 'pioneer';

      const badgeAsset: StarterPackAsset = {
        assetType: 'badge_model',
        assetId: `bm-founder-badge-${tier}`,
        assetName: `Founder ${tier.charAt(0).toUpperCase() + tier.slice(1)} Badge 3D Model`,
      };

      await this.grantAsset(founder.id, badgeAsset);

      logger.info(
        `[FounderOnboarding] Tier badge model granted to founder ${founder.id}: ${badgeAsset.assetId}`
      );
    } catch (error) {
      logger.warn(
        `[FounderOnboarding] Failed to grant tier badge model to founder ${founder.id}: ` +
        getErrorMessage(error)
      );
    }
  }

  /**
   * Get all assets granted to a founder.
   */
  async getGrantedAssets(founderId: string): Promise<Array<{
    assetType: string;
    assetId: string;
    assetName: string;
    grantedAt: Date;
  }>> {
    try {
      const { rows } = await query(
        `SELECT asset_type, asset_id, asset_name, granted_at
         FROM founder_asset_grants
         WHERE founder_id = $1
         ORDER BY granted_at ASC`,
        [founderId]
      );

      return (rows || []).map((row: any) => ({
        assetType: row.asset_type,
        assetId: row.asset_id,
        assetName: row.asset_name,
        grantedAt: new Date(row.granted_at),
      }));
    } catch (error) {
      logger.error('[FounderOnboarding] Error getting granted assets:', getErrorMessage(error));
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Validation Helpers
  // --------------------------------------------------------------------------

  /**
   * Check if a founder can advance from their current step.
   * Each step may have prerequisites.
   */
  async canAdvance(founderId: string): Promise<{ canAdvance: boolean; reason?: string }> {
    try {
      const foundersService = getFoundersProgramService();
      const founder = await foundersService.getFounderById(founderId);

      if (!founder) {
        return { canAdvance: false, reason: 'Founder not found' };
      }

      if (founder.applicationStatus !== 'approved') {
        return { canAdvance: false, reason: 'Application not approved' };
      }

      if (founder.onboardingStep === 'complete') {
        return { canAdvance: false, reason: 'Onboarding already complete' };
      }

      // Step-specific prerequisites
      switch (founder.onboardingStep) {
        case 'profile': {
          // Must have a creator profile
          const { rows } = await query(
            'SELECT id FROM creator_profiles WHERE user_id = $1 LIMIT 1',
            [founder.userId]
          );
          if (!rows || rows.length === 0) {
            return { canAdvance: false, reason: 'Creator profile not yet created' };
          }
          break;
        }

        case 'first_world': {
          // Must have at least one forked template world
          const { rows } = await query(
            'SELECT id FROM founder_template_worlds WHERE founder_id = $1 LIMIT 1',
            [founderId]
          );
          if (!rows || rows.length === 0) {
            return { canAdvance: false, reason: 'No template world forked yet' };
          }
          break;
        }

        default:
          // No prerequisites for other steps (welcome, tutorial, community)
          break;
      }

      return { canAdvance: true };
    } catch (error) {
      logger.error('[FounderOnboarding] Error checking canAdvance:', getErrorMessage(error));
      return { canAdvance: false, reason: 'Internal error' };
    }
  }

  /**
   * Get the step configuration and metadata for display purposes.
   */
  getStepConfig(step: FounderOnboardingStep): {
    step: FounderOnboardingStep;
    title: string;
    description: string;
    estimatedMinutes: number;
  } {
    const configs: Record<FounderOnboardingStep, { title: string; description: string; estimatedMinutes: number }> = {
      welcome: {
        title: 'Welcome to the Founders Program',
        description: 'Learn about your founder benefits, exclusive assets, and elevated quotas.',
        estimatedMinutes: 2,
      },
      profile: {
        title: 'Set Up Your Creator Profile',
        description: 'Complete your public creator profile with display name, bio, and portfolio links.',
        estimatedMinutes: 5,
      },
      first_world: {
        title: 'Create Your First World',
        description: 'Choose a template and fork your first VR world. You have access to all 8 templates.',
        estimatedMinutes: 10,
      },
      tutorial: {
        title: 'HoloScript Tutorial',
        description: 'Learn the basics of HoloScript to customize and build interactive VR experiences.',
        estimatedMinutes: 15,
      },
      community: {
        title: 'Join the Founder Community',
        description: 'Connect with fellow founders, join exclusive channels, and explore collaboration opportunities.',
        estimatedMinutes: 5,
      },
      complete: {
        title: 'Onboarding Complete',
        description: 'You are fully onboarded! Explore your starter pack assets and start building.',
        estimatedMinutes: 0,
      },
    };

    return { step, ...configs[step] };
  }

  /**
   * Get all step configurations in order.
   */
  getAllStepConfigs(): Array<ReturnType<typeof this.getStepConfig>> {
    return ONBOARDING_STEPS.map(step => this.getStepConfig(step));
  }
}

// Singleton accessor
export const founderOnboardingService = FounderOnboardingService.getInstance();

export function getFounderOnboardingService(): FounderOnboardingService {
  return FounderOnboardingService.getInstance();
}
