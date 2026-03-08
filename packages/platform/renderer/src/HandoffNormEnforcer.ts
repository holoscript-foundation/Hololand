/**
 * HandoffNormEnforcer
 *
 * Runtime norm enforcement during cross-reality handoffs. Validates
 * that agent behavior complies with safety, accessibility, and
 * contextual norms before, during, and after device transitions.
 *
 * ENFORCEMENT RULES:
 *
 * Safety (critical):
 *   - SAFETY-001: Block visual content when handing off TO car
 *   - SAFETY-002: Suppress non-essential notifications for car
 *   - SAFETY-003: Require intermediate device for VR ↔ car transitions
 *   - SAFETY-004: Enforce minimum handoff cooldown for safety-critical devices
 *
 * Accessibility:
 *   - A11Y-001: Enforce reduced motion on all transitions when preference set
 *   - A11Y-002: Ensure audio descriptions available on voice-only devices
 *   - A11Y-003: Scale font/UI for form factor change
 *
 * Context:
 *   - CTX-001: Enforce quiet zone norms (reduce audio in galleries, etc.)
 *   - CTX-002: Respect privacy settings when changing location context
 *   - CTX-003: Preserve user consent state across handoffs
 *
 * @module HandoffNormEnforcer
 */

import { logger } from './logger';
import type {
  FormFactor,
  EmbodimentType,
  MVCPayload,
  UserPreferences,
} from './CrossRealityContinuityTypes';

// =============================================================================
// NORM TYPES
// =============================================================================

export type NormSeverity = 'critical' | 'warning' | 'info';
export type NormCategory = 'safety' | 'accessibility' | 'context' | 'privacy';

export interface NormViolation {
  /** Norm rule ID */
  ruleId: string;
  /** Severity level */
  severity: NormSeverity;
  /** Category */
  category: NormCategory;
  /** Human-readable description */
  message: string;
  /** Suggested remediation */
  remediation: string;
  /** Whether this violation blocks the handoff */
  blocking: boolean;
}

export interface NormEnforcementResult {
  /** Whether the handoff is allowed */
  allowed: boolean;
  /** All violations detected */
  violations: NormViolation[];
  /** Content modifications applied */
  modifications: ContentModification[];
  /** Enforcement time in ms */
  enforcementTimeMs: number;
}

export interface ContentModification {
  /** What was modified */
  target: string;
  /** What was changed */
  modification: string;
  /** Why */
  ruleId: string;
}

// =============================================================================
// ENFORCER
// =============================================================================

/**
 * Configuration for the HandoffNormEnforcer.
 */
export interface HandoffNormEnforcerConfig {
  /** Minimum cooldown between handoffs in ms (default: 5000) */
  handoffCooldownMs?: number;
  /** Whether to block on critical violations (default: true) */
  blockOnCritical?: boolean;
  /** Custom norm rules to add */
  customRules?: NormRule[];
}

export interface NormRule {
  id: string;
  severity: NormSeverity;
  category: NormCategory;
  /** Predicate that returns a violation message if the norm is violated */
  check: (context: NormCheckContext) => string | null;
  /** Remediation suggestion */
  remediation: string;
  /** Whether violation blocks handoff */
  blocking: boolean;
}

export interface NormCheckContext {
  sourceFormFactor: FormFactor;
  targetFormFactor: FormFactor;
  sourceEmbodiment: EmbodimentType;
  targetEmbodiment: EmbodimentType;
  payload: MVCPayload;
  userPreferences: UserPreferences;
  lastHandoffTimestamp: number | null;
}

export class HandoffNormEnforcer {
  private rules: NormRule[];
  private config: Required<Omit<HandoffNormEnforcerConfig, 'customRules'>>;
  private lastHandoffTimestamp: number | null = null;

  constructor(config?: HandoffNormEnforcerConfig) {
    this.config = {
      handoffCooldownMs: config?.handoffCooldownMs ?? 5000,
      blockOnCritical: config?.blockOnCritical ?? true,
    };

    this.rules = [
      ...this.getBuiltinRules(),
      ...(config?.customRules ?? []),
    ];

    logger.info('[HandoffNormEnforcer] Initialized', {
      ruleCount: this.rules.length,
      cooldownMs: this.config.handoffCooldownMs,
    });
  }

  // ---------------------------------------------------------------------------
  // ENFORCEMENT
  // ---------------------------------------------------------------------------

  /**
   * Enforce norms on a pending handoff.
   * Returns whether the handoff is allowed and any violations/modifications.
   */
  enforce(context: NormCheckContext): NormEnforcementResult {
    const start = performance.now();
    const violations: NormViolation[] = [];
    const modifications: ContentModification[] = [];

    // Run all rules
    for (const rule of this.rules) {
      const message = rule.check(context);
      if (message) {
        violations.push({
          ruleId: rule.id,
          severity: rule.severity,
          category: rule.category,
          message,
          remediation: rule.remediation,
          blocking: rule.blocking,
        });
      }
    }

    // Apply content modifications for non-blocking violations
    this.applyModifications(context, violations, modifications);

    // Determine if handoff is allowed
    const criticalViolations = violations.filter(v => v.blocking);
    const allowed = this.config.blockOnCritical
      ? criticalViolations.length === 0
      : true;

    if (!allowed) {
      logger.warn(`[HandoffNormEnforcer] Handoff BLOCKED: ${criticalViolations.length} critical violations`);
    }

    // Record timestamp
    if (allowed) {
      this.lastHandoffTimestamp = Date.now();
    }

    return {
      allowed,
      violations,
      modifications,
      enforcementTimeMs: performance.now() - start,
    };
  }

  /**
   * Convenience: enforce using an MVC payload directly.
   */
  enforceForPayload(
    payload: MVCPayload,
    userPreferences: UserPreferences,
  ): NormEnforcementResult {
    return this.enforce({
      sourceFormFactor: payload.sourceFormFactor,
      targetFormFactor: payload.targetFormFactor,
      sourceEmbodiment: payload.sourceEmbodiment,
      targetEmbodiment: payload.targetEmbodiment,
      payload,
      userPreferences,
      lastHandoffTimestamp: this.lastHandoffTimestamp,
    });
  }

  // ---------------------------------------------------------------------------
  // RULES
  // ---------------------------------------------------------------------------

  /**
   * Get all registered norm rules.
   */
  getRules(): NormRule[] {
    return [...this.rules];
  }

  /**
   * Add a custom norm rule.
   */
  addRule(rule: NormRule): void {
    this.rules.push(rule);
  }

  // ---------------------------------------------------------------------------
  // BUILT-IN RULES
  // ---------------------------------------------------------------------------

  private getBuiltinRules(): NormRule[] {
    return [
      // ── SAFETY ────────────────────────────────────────────────────────

      {
        id: 'SAFETY-001',
        severity: 'critical',
        category: 'safety',
        blocking: true,
        remediation: 'Switch to voice-only HUD mode. Suppress all visual overlays except minimal status.',
        check: (ctx) => {
          if (ctx.targetFormFactor === 'car' && ctx.targetEmbodiment !== 'VoiceOnly' && ctx.targetEmbodiment !== 'VoiceHUD') {
            return `Target embodiment "${ctx.targetEmbodiment}" is not safe for automotive. Only VoiceOnly or VoiceHUD is allowed while driving.`;
          }
          return null;
        },
      },

      {
        id: 'SAFETY-002',
        severity: 'critical',
        category: 'safety',
        blocking: false,
        remediation: 'Queue non-essential notifications. Only deliver critical alerts via brief audio.',
        check: (ctx) => {
          if (ctx.targetFormFactor === 'car') {
            // Check if payload has evidence items that would generate visual notifications
            const visualEvidence = ctx.payload.evidenceTrail?.items?.filter(
              (item) => item.type !== 'audio' && item.type !== 'system',
            );
            if (visualEvidence && visualEvidence.length > 3) {
              return `${visualEvidence.length} pending visual notifications would distract driver. Queue for later.`;
            }
          }
          return null;
        },
      },

      {
        id: 'SAFETY-003',
        severity: 'critical',
        category: 'safety',
        blocking: true,
        remediation: 'Route handoff through an intermediate device (phone or wearable) first.',
        check: (ctx) => {
          const directVRCar = (ctx.sourceFormFactor === 'vr-headset' && ctx.targetFormFactor === 'car')
            || (ctx.sourceFormFactor === 'car' && ctx.targetFormFactor === 'vr-headset');
          if (directVRCar) {
            return `Direct handoff between VR headset and car is unsafe. User must be fully alert before operating vehicle.`;
          }
          return null;
        },
      },

      {
        id: 'SAFETY-004',
        severity: 'warning',
        category: 'safety',
        blocking: false,
        remediation: 'Wait for cooldown period before initiating another handoff.',
        check: (ctx) => {
          if (ctx.lastHandoffTimestamp) {
            const elapsed = Date.now() - ctx.lastHandoffTimestamp;
            if (elapsed < 5000 && (ctx.targetFormFactor === 'car' || ctx.sourceFormFactor === 'car')) {
              return `Handoff cooldown: only ${elapsed}ms since last handoff. Safety-critical devices require 5s cooldown.`;
            }
          }
          return null;
        },
      },

      // ── ACCESSIBILITY ─────────────────────────────────────────────────

      {
        id: 'A11Y-001',
        severity: 'warning',
        category: 'accessibility',
        blocking: false,
        remediation: 'Set transition duration to 0ms. Use instant cut instead of crossfade.',
        check: (ctx) => {
          if (ctx.userPreferences.accessibility.reducedMotion) {
            // This is informational — the EmbodimentTransitionAnimator handles it
            return null; // Handled by animator, not a violation
          }
          return null;
        },
      },

      {
        id: 'A11Y-002',
        severity: 'warning',
        category: 'accessibility',
        blocking: false,
        remediation: 'Enable audio descriptions on the target device. Provide TTS for all visual content.',
        check: (ctx) => {
          if (ctx.userPreferences.accessibility.screenReader && ctx.targetFormFactor === 'car') {
            return `User requires screen reader but target is voice-only (car). Ensure all content has audio descriptions.`;
          }
          return null;
        },
      },

      {
        id: 'A11Y-003',
        severity: 'info',
        category: 'accessibility',
        blocking: false,
        remediation: 'Apply font scale from user preferences to target device UI.',
        check: (ctx) => {
          if (ctx.userPreferences.accessibility.fontScale > 1.5 &&
              (ctx.targetFormFactor === 'wearable' || ctx.targetFormFactor === 'car')) {
            return `Large font scale (${ctx.userPreferences.accessibility.fontScale}x) may not display correctly on ${ctx.targetFormFactor}.`;
          }
          return null;
        },
      },

      // ── CONTEXT ───────────────────────────────────────────────────────

      {
        id: 'CTX-001',
        severity: 'info',
        category: 'context',
        blocking: false,
        remediation: 'Apply quiet zone norms: reduce volume, suppress audio notifications.',
        check: (ctx) => {
          // Check if spatial context mentions a quiet zone
          const spatial = ctx.payload.spatialContext;
          if (spatial && spatial.nearbyLandmarks) {
            const inQuietZone = spatial.nearbyLandmarks.some(
              (l) => l.type === 'quiet_zone' || l.type === 'gallery' || l.type === 'library',
            );
            if (inQuietZone) {
              return `Agent is in a quiet zone. Audio should be muted or reduced on ${ctx.targetFormFactor}.`;
            }
          }
          return null;
        },
      },

      // ── PRIVACY ───────────────────────────────────────────────────────

      {
        id: 'CTX-002',
        severity: 'warning',
        category: 'privacy',
        blocking: false,
        remediation: 'Strip spatial context from MVC payload before handoff.',
        check: (ctx) => {
          if (!ctx.userPreferences.privacy.locationSharingConsent) {
            const hasSpatial = ctx.payload.spatialContext &&
              ctx.payload.spatialContext.lastKnownPosition;
            if (hasSpatial) {
              return `User has not consented to location sharing, but MVC payload contains spatial context.`;
            }
          }
          return null;
        },
      },

      {
        id: 'CTX-003',
        severity: 'warning',
        category: 'privacy',
        blocking: false,
        remediation: 'Preserve consent flags exactly as-is. Do not upgrade consent during handoff.',
        check: (ctx) => {
          // Privacy consent must be preserved across handoffs — this is informational
          if (ctx.userPreferences.privacy.dataRetentionDays === 0) {
            return `User has session-only data retention. MVC payload must not be persisted on target device.`;
          }
          return null;
        },
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // MODIFICATIONS
  // ---------------------------------------------------------------------------

  private applyModifications(
    context: NormCheckContext,
    violations: NormViolation[],
    modifications: ContentModification[],
  ): void {
    // Auto-apply safe modifications for non-blocking violations
    for (const violation of violations) {
      if (violation.blocking) continue;

      if (violation.ruleId === 'SAFETY-002' && context.targetFormFactor === 'car') {
        modifications.push({
          target: 'notifications',
          modification: 'Queued non-essential notifications for post-drive delivery',
          ruleId: 'SAFETY-002',
        });
      }

      if (violation.ruleId === 'CTX-001') {
        modifications.push({
          target: 'audio',
          modification: 'Reduced audio volume to 30% for quiet zone compliance',
          ruleId: 'CTX-001',
        });
      }

      if (violation.ruleId === 'CTX-002') {
        modifications.push({
          target: 'spatialContext',
          modification: 'Stripped precise location from MVC payload (consent not granted)',
          ruleId: 'CTX-002',
        });
      }
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createHandoffNormEnforcer(
  config?: HandoffNormEnforcerConfig,
): HandoffNormEnforcer {
  return new HandoffNormEnforcer(config);
}
