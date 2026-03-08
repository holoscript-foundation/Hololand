/**
 * @vitest-environment jsdom
 */

/**
 * Tests for CrossRealityContinuityTypes
 *
 * Validates:
 * - GeospatialCoordinate creation and validation
 * - Form factor budgets and embodiment mappings
 * - MVC Object factories (all 5 objects)
 * - MVCPayload creation and size estimation
 * - AuthenticatedCRDTOperation type shape
 * - HandoffStatus phase transitions
 * - Event type definitions
 */

import { describe, it, expect } from 'vitest';

import {
  type GeospatialCoordinate,
  type GeospatialSource,
  type FormFactor,
  type EmbodimentType,
  type MVCPayload,
  type AgentDecision,
  type TaskStep,
  type EvidenceItem,
  type AuthenticatedCRDTOperation,
  type HandoffPhase,
  type HandoffStatus,
  type DIDIdentity,
  type CRDTValidationResult,
  DEFAULT_EMBODIMENT,
  FORM_FACTOR_BUDGETS,
  createEmptyDecisionHistory,
  createEmptyActiveTaskState,
  createDefaultUserPreferences,
  createEmptySpatialContext,
  createEmptyEvidenceTrail,
  createMVCPayload,
  estimateMVCPayloadSize,
} from '../CrossRealityContinuityTypes';

// =============================================================================
// GEOSPATIAL COORDINATES
// =============================================================================

describe('GeospatialCoordinate', () => {
  it('represents a GPS position with accuracy', () => {
    const coord: GeospatialCoordinate = {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 16.0,
      horizontalAccuracy: 3.5,
      verticalAccuracy: 5.0,
      heading: 270,
      source: 'gps',
      capturedAt: Date.now(),
    };

    expect(coord.latitude).toBe(37.7749);
    expect(coord.longitude).toBe(-122.4194);
    expect(coord.altitude).toBe(16.0);
    expect(coord.source).toBe('gps');
  });

  it('supports null altitude for 2D-only positioning', () => {
    const coord: GeospatialCoordinate = {
      latitude: 48.8566,
      longitude: 2.3522,
      altitude: null,
      horizontalAccuracy: 2.0,
      verticalAccuracy: null,
      heading: null,
      source: 'wifi-fingerprint',
      capturedAt: Date.now(),
    };

    expect(coord.altitude).toBeNull();
    expect(coord.verticalAccuracy).toBeNull();
    expect(coord.heading).toBeNull();
  });

  it('covers all positioning source types', () => {
    const sources: GeospatialSource[] = [
      'gps', 'vps', 'wifi-fingerprint', 'ble-beacon',
      'fiducial-marker', 'dead-reckoning', 'manual', 'unknown',
    ];
    expect(sources).toHaveLength(8);
  });
});

// =============================================================================
// FORM FACTOR & EMBODIMENT
// =============================================================================

describe('FormFactor and Embodiment', () => {
  it('maps all 6 form factors to embodiments', () => {
    const formFactors: FormFactor[] = [
      'vr-headset', 'ar-glasses', 'phone', 'desktop', 'car', 'wearable',
    ];

    for (const ff of formFactors) {
      expect(DEFAULT_EMBODIMENT[ff]).toBeDefined();
    }
  });

  it('assigns correct default embodiments', () => {
    expect(DEFAULT_EMBODIMENT['vr-headset']).toBe('Avatar3D');
    expect(DEFAULT_EMBODIMENT['ar-glasses']).toBe('SpatialPersona');
    expect(DEFAULT_EMBODIMENT['phone']).toBe('UI2D');
    expect(DEFAULT_EMBODIMENT['desktop']).toBe('UI2D'); // Desktop defaults to UI2D
    expect(DEFAULT_EMBODIMENT['car']).toBe('VoiceOnly'); // Car defaults to VoiceOnly
    expect(DEFAULT_EMBODIMENT['wearable']).toBe('UIMinimal'); // Wearable defaults to UIMinimal
  });

  it('defines performance budgets for all form factors', () => {
    const formFactors: FormFactor[] = [
      'vr-headset', 'ar-glasses', 'phone', 'desktop', 'car', 'wearable',
    ];

    for (const ff of formFactors) {
      const budget = FORM_FACTOR_BUDGETS[ff];
      expect(budget).toBeDefined();
      expect(budget.frameBudgetMs).toBeGreaterThan(0);
      expect(budget.agentBudgetMs).toBeGreaterThan(0);
      expect(['edge-first', 'cloud-first', 'safety-critical']).toContain(budget.computeModel);
    }
  });

  it('VR has strictest frame budget', () => {
    expect(FORM_FACTOR_BUDGETS['vr-headset'].frameBudgetMs).toBeLessThan(
      FORM_FACTOR_BUDGETS['phone'].frameBudgetMs,
    );
  });

  it('car uses safety-critical compute model', () => {
    expect(FORM_FACTOR_BUDGETS['car'].computeModel).toBe('safety-critical');
  });

  it('agent budgets vary 40x across form factors (W.029)', () => {
    const vrBudget = FORM_FACTOR_BUDGETS['vr-headset'].agentBudgetMs;
    const desktopBudget = FORM_FACTOR_BUDGETS['desktop'].agentBudgetMs;
    expect(desktopBudget / vrBudget).toBe(40);
  });
});

// =============================================================================
// MVC OBJECT 1: DECISION HISTORY
// =============================================================================

describe('DecisionHistory', () => {
  it('creates empty decision history', () => {
    const history = createEmptyDecisionHistory();
    expect(history.decisions).toHaveLength(0);
    expect(history.totalDecisionCount).toBe(0);
    expect(history.successRate).toBe(0);
  });

  it('decision has required fields', () => {
    const decision: AgentDecision = {
      id: 'dec-001',
      summary: 'Navigate to waypoint Alpha',
      rationale: 'Closest objective with highest reward',
      alternatives: ['waypoint Beta', 'stay here'],
      confidence: 0.87,
      category: 'navigation',
      decidedAt: Date.now(),
      outcome: 'success',
    };

    expect(decision.category).toBe('navigation');
    expect(decision.alternatives).toHaveLength(2);
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// MVC OBJECT 2: ACTIVE TASK STATE
// =============================================================================

describe('ActiveTaskState', () => {
  it('creates empty active task state', () => {
    const task = createEmptyActiveTaskState();
    expect(task.taskId).toBe('');
    expect(task.progress).toBe(0);
    expect(task.steps).toHaveLength(0);
    expect(task.pausable).toBe(true);
  });

  it('task steps track progress', () => {
    const steps: TaskStep[] = [
      { description: 'Gather materials', status: 'completed', progress: 100 },
      { description: 'Build structure', status: 'in_progress', progress: 60 },
      { description: 'Apply textures', status: 'pending', progress: 0 },
    ];

    expect(steps.filter(s => s.status === 'completed')).toHaveLength(1);
    expect(steps.filter(s => s.status === 'in_progress')).toHaveLength(1);
  });
});

// =============================================================================
// MVC OBJECT 3: USER PREFERENCES
// =============================================================================

describe('UserPreferences', () => {
  it('creates default user preferences', () => {
    const prefs = createDefaultUserPreferences();

    // Interaction modes match form factors
    expect(prefs.interactionMode['vr-headset']).toBe('gesture');
    expect(prefs.interactionMode['car']).toBe('voice');
    expect(prefs.interactionMode['desktop']).toBe('keyboard');
    expect(prefs.interactionMode['phone']).toBe('touch');
  });

  it('privacy defaults to no consent (opt-in)', () => {
    const prefs = createDefaultUserPreferences();
    expect(prefs.privacy.spatialMemoryConsent).toBe(false);
    expect(prefs.privacy.emotionDetectionConsent).toBe(false);
    expect(prefs.privacy.locationSharingConsent).toBe(false);
    expect(prefs.privacy.dataRetentionDays).toBe(0);
  });

  it('accessibility defaults are non-restrictive', () => {
    const prefs = createDefaultUserPreferences();
    expect(prefs.accessibility.highContrast).toBe(false);
    expect(prefs.accessibility.reducedMotion).toBe(false);
    expect(prefs.accessibility.fontScale).toBe(1.0);
    expect(prefs.accessibility.hapticFeedback).toBe(true);
  });
});

// =============================================================================
// MVC OBJECT 4: SPATIAL CONTEXT SUMMARY
// =============================================================================

describe('SpatialContextSummary', () => {
  it('creates empty spatial context with previous form factor', () => {
    const ctx = createEmptySpatialContext('vr-headset');
    expect(ctx.geospatial).toBeNull();
    expect(ctx.localPosition).toBeNull();
    expect(ctx.previousFormFactor).toBe('vr-headset');
    expect(ctx.previousEmbodiment).toBe('Avatar3D');
    expect(ctx.upVector).toEqual({ x: 0, y: 1, z: 0 });
    expect(ctx.nearbyLandmarks).toHaveLength(0);
  });

  it('preserves source embodiment from previous form factor', () => {
    const ctx = createEmptySpatialContext('car');
    expect(ctx.previousFormFactor).toBe('car');
    expect(ctx.previousEmbodiment).toBe('VoiceOnly'); // Car defaults to VoiceOnly
  });
});

// =============================================================================
// MVC OBJECT 5: EVIDENCE TRAIL
// =============================================================================

describe('EvidenceTrail', () => {
  it('creates empty evidence trail', () => {
    const trail = createEmptyEvidenceTrail();
    expect(trail.items).toHaveLength(0);
    expect(trail.totalItemCount).toBe(0);
    expect(trail.aggregateConfidence).toBe(0);
  });

  it('evidence items have source tracking', () => {
    const item: EvidenceItem = {
      id: 'ev-001',
      summary: 'User expressed preference for quiet environment',
      sourceType: 'user-input',
      sourceRef: 'voice-command:2026-03-06T14:30:00Z',
      confidence: 0.95,
      gatheredAt: Date.now(),
      stale: false,
    };

    expect(item.sourceType).toBe('user-input');
    expect(item.confidence).toBeGreaterThan(0.9);
    expect(item.stale).toBe(false);
  });
});

// =============================================================================
// MVC PAYLOAD
// =============================================================================

describe('MVCPayload', () => {
  it('creates a complete handoff payload', () => {
    const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'phone');

    expect(payload.version).toBe(1);
    expect(payload.agentId).toBe('brittney');
    expect(payload.agentName).toBe('Brittney');
    expect(payload.sourceFormFactor).toBe('vr-headset');
    expect(payload.targetFormFactor).toBe('phone');
    expect(payload.sourceEmbodiment).toBe('Avatar3D');
    expect(payload.targetEmbodiment).toBe('UI2D');
  });

  it('generates unique handoff IDs', () => {
    const p1 = createMVCPayload('agent-1', 'Agent 1', 'desktop', 'phone');
    const p2 = createMVCPayload('agent-1', 'Agent 1', 'desktop', 'phone');
    expect(p1.handoffId).not.toBe(p2.handoffId);
  });

  it('sets 5-minute expiry', () => {
    const payload = createMVCPayload('agent', 'Agent', 'phone', 'desktop');
    const fiveMinutesMs = 5 * 60 * 1000;
    expect(payload.expiresAt - payload.createdAt).toBe(fiveMinutesMs);
  });

  it('includes all 5 MVC objects', () => {
    const payload = createMVCPayload('agent', 'Agent', 'vr-headset', 'ar-glasses');
    expect(payload.decisionHistory).toBeDefined();
    expect(payload.activeTask).toBeDefined();
    expect(payload.userPreferences).toBeDefined();
    expect(payload.spatialContext).toBeDefined();
    expect(payload.evidenceTrail).toBeDefined();
  });

  it('empty payload is under 10KB (W.026)', () => {
    const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'phone');
    const sizeBytes = estimateMVCPayloadSize(payload);
    expect(sizeBytes).toBeLessThan(10 * 1024); // <10KB
  });

  it('payload with moderate content stays under 10KB', () => {
    const payload = createMVCPayload('brittney', 'Brittney', 'vr-headset', 'phone', {
      decisionHistory: {
        decisions: Array.from({ length: 15 }, (_, i) => ({
          id: `dec-${i}`,
          summary: `Decision ${i}: chose path ${i % 3}`,
          rationale: 'Best available option given constraints',
          alternatives: ['option-a', 'option-b'],
          confidence: 0.8 + (i % 20) / 100,
          category: 'task' as const,
          decidedAt: Date.now() - i * 60000,
          outcome: 'success' as const,
        })),
        totalDecisionCount: 15,
        successRate: 0.87,
        updatedAt: Date.now(),
      },
      evidenceTrail: {
        items: Array.from({ length: 10 }, (_, i) => ({
          id: `ev-${i}`,
          summary: `Observed spatial feature ${i} at location`,
          sourceType: 'observation' as const,
          sourceRef: `sensor:lidar:frame-${i}`,
          confidence: 0.9,
          gatheredAt: Date.now() - i * 30000,
          stale: false,
        })),
        totalItemCount: 10,
        aggregateConfidence: 0.88,
        updatedAt: Date.now(),
      },
    });

    const sizeBytes = estimateMVCPayloadSize(payload);
    expect(sizeBytes).toBeLessThan(10 * 1024);
  });

  it('allows embodiment override', () => {
    const payload = createMVCPayload('agent', 'Agent', 'phone', 'ar-glasses', {
      targetEmbodiment: 'WebXR',
    });
    expect(payload.targetEmbodiment).toBe('WebXR');
  });
});

// =============================================================================
// AUTHENTICATED CRDT OPERATIONS
// =============================================================================

describe('AuthenticatedCRDTOperation', () => {
  it('has required fields for DID-signed operations', () => {
    const op: AuthenticatedCRDTOperation<string> = {
      operationId: 'op-001',
      authorDID: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
      deviceId: 'quest3-serial-abc123',
      type: 'set',
      key: 'agent.position',
      value: JSON.stringify({ x: 1, y: 2, z: 3 }),
      hlcTimestamp: '2026-03-06T14:30:00.000Z:0001:node1',
      vectorClock: { 'quest3': 5, 'phone': 3 },
      signature: 'base64url-ed25519-signature',
      capabilityScope: ['spatial:write', 'agent:state'],
      createdAt: Date.now(),
    };

    expect(op.authorDID).toContain('did:key:');
    expect(op.type).toBe('set');
    expect(op.vectorClock['quest3']).toBe(5);
    expect(op.capabilityScope).toContain('spatial:write');
  });

  it('supports all operation types', () => {
    const types: AuthenticatedCRDTOperation['type'][] = [
      'set', 'delete', 'increment', 'append', 'merge',
    ];
    expect(types).toHaveLength(5);
  });

  it('DID identity supports Ed25519 and secp256k1', () => {
    const ed25519Identity: DIDIdentity = {
      did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
      publicKey: 'base64url-encoded-public-key',
      algorithm: 'Ed25519',
      deviceAttestation: null,
    };

    const secpIdentity: DIDIdentity = {
      did: 'did:key:zQ3shokFTS3brHcDQrn82RUDfCZESWL1ZdCEJwekUDPQiYBme',
      publicKey: 'base64url-encoded-secp-key',
      algorithm: 'secp256k1',
      deviceAttestation: 'android-keystore-attestation',
    };

    expect(ed25519Identity.algorithm).toBe('Ed25519');
    expect(secpIdentity.deviceAttestation).toBeTruthy();
  });

  it('validation result includes latency measurement', () => {
    const result: CRDTValidationResult = {
      valid: true,
      validationMs: 0.08,
    };
    expect(result.valid).toBe(true);
    expect(result.validationMs).toBeLessThan(1); // <1ms target
  });

  it('validation can reject with specific reasons', () => {
    const result: CRDTValidationResult = {
      valid: false,
      rejectionReason: 'revoked-did',
      validationMs: 0.12,
    };
    expect(result.valid).toBe(false);
    expect(result.rejectionReason).toBe('revoked-did');
  });
});

// =============================================================================
// HANDOFF PROTOCOL
// =============================================================================

describe('HandoffStatus', () => {
  it('tracks handoff through all phases', () => {
    const phases: HandoffPhase[] = [
      'capability-negotiation',
      'mvc-transfer',
      'embodiment-adaptation',
      'context-loading',
      'complete',
    ];
    expect(phases).toHaveLength(5);
  });

  it('represents a complete handoff status', () => {
    const status: HandoffStatus = {
      handoffId: 'handoff:brittney:1709744400000:abc123',
      phase: 'mvc-transfer',
      progress: 40,
      source: {
        formFactor: 'vr-headset',
        deviceId: 'quest3-001',
        embodiment: 'Avatar3D',
      },
      target: {
        formFactor: 'phone',
        deviceId: 'pixel9-001',
        embodiment: 'UI2D',
        capabilities: ['touch', 'gps', 'camera', 'npu'],
      },
      elapsedMs: 85,
      errors: [],
      initiatedAt: Date.now(),
    };

    expect(status.phase).toBe('mvc-transfer');
    expect(status.source.formFactor).toBe('vr-headset');
    expect(status.target.formFactor).toBe('phone');
    expect(status.target.capabilities).toContain('gps');
    expect(status.errors).toHaveLength(0);
  });
});
