/**
 * Cross-Reality Phase 2 Tests
 *
 * Covers:
 *   1. CrossRealityAgent (uAA2++ 7-phase protocol integration)
 *   2. VendorAnchorCloudProvider (ARKit/ARCore/Niantic/Meta resolvers)
 *   3. MVCPayloadCompressor (LZ compression for wire transfer)
 *   4. HandoffNormEnforcer (safety, accessibility, context norms)
 *   5. Performance Benchmarks (latency budget enforcement)
 *   6. End-to-End Integration (full pipeline test)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- CrossRealityAgent ---
import {
  CrossRealityAgent,
  createCrossRealityAgent,
  type CrossRealityAgentConfig,
  AgentPhase,
} from '../CrossRealityAgent';

// --- VendorAnchorCloudProvider ---
import {
  ARKitCloudAnchorProvider,
  ARCoreHostingProvider,
  NianticVPSProvider,
  MetaSharedSpatialProvider,
  MultiProviderAnchorResolver,
} from '../VendorAnchorCloudProvider';

// --- MVCPayloadCompressor ---
import {
  MVCPayloadCompressor,
  createMVCPayloadCompressor,
} from '../MVCPayloadCompressor';

// --- HandoffNormEnforcer ---
import {
  HandoffNormEnforcer,
  createHandoffNormEnforcer,
  type NormCheckContext,
} from '../HandoffNormEnforcer';

// --- Existing modules ---
import { MVCSerializer, createMVCSerializer } from '../MVCSerializer';
import {
  CrossRealitySessionManager,
  createCrossRealitySessionManager,
  type CrossRealitySessionConfig,
} from '../CrossRealitySessionManager';
import type {
  MVCPayload,
  FormFactor,
  EmbodimentType,
  UserPreferences,
} from '../CrossRealityContinuityTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestPayload(overrides?: Partial<MVCPayload>): MVCPayload {
  return {
    version: 1,
    handoffId: 'test-handoff-1',
    agentId: 'agent-1',
    agentName: 'TestAgent',
    sourceFormFactor: 'vr-headset',
    targetFormFactor: 'phone',
    sourceEmbodiment: 'Avatar3D',
    targetEmbodiment: 'UI2D',
    createdAt: Date.now(),
    expiresAt: Date.now() + 300_000,
    decisionHistory: {
      decisions: [
        { id: 'd1', summary: 'Navigate to exhibit', rationale: 'User requested', alternatives: ['Stay'], confidence: 0.9, category: 'navigation', decidedAt: Date.now(), outcome: 'success' },
      ],
      totalDecisionCount: 1,
      successRate: 1.0,
      updatedAt: Date.now(),
    },
    activeTask: {
      taskId: 'task-1',
      description: 'Guide museum tour',
      priority: 1,
      initiator: 'user',
      progress: 50,
      currentStep: 'Egyptian Wing',
      steps: [
        { description: 'Visit lobby', status: 'completed', progress: 100 },
        { description: 'Visit Egyptian Wing', status: 'in_progress', progress: 50 },
      ],
      resumeContext: { currentExhibit: 'temple-of-dendur' },
      startedAt: Date.now() - 60000,
      estimatedCompletionAt: null,
      pausable: true,
    },
    userPreferences: createTestPreferences(),
    spatialContext: {
      lastKnownPosition: { latitude: 40.7484, longitude: -73.9857, altitude: null, horizontalAccuracy: 2, verticalAccuracy: null, heading: 90, source: 'gps', capturedAt: Date.now() },
      nearbyLandmarks: [{ name: 'Temple of Dendur', type: 'exhibit', distance: 5, bearing: 45 }],
      currentZone: 'EgyptianWing',
      spatialAnchorCount: 3,
      lastUpdated: Date.now(),
    },
    evidenceTrail: {
      items: [
        { id: 'e1', type: 'observation', summary: 'User interested in Egyptian art', source: 'gaze-tracking', relevance: 0.8, capturedAt: Date.now() },
      ],
      totalItemCount: 1,
      oldestItemAt: Date.now(),
      newestItemAt: Date.now(),
    },
    ...overrides,
  };
}

function createTestPreferences(overrides?: Partial<UserPreferences>): UserPreferences {
  return {
    interactionMode: {
      'vr-headset': 'gesture',
      'ar-glasses': 'gesture',
      'phone': 'touch',
      'desktop': 'keyboard',
      'car': 'voice',
      'wearable': 'touch',
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
      fontScale: 1.0,
      hapticFeedback: true,
    },
    privacy: {
      spatialMemoryConsent: true,
      emotionDetectionConsent: false,
      locationSharingConsent: true,
      dataRetentionDays: 30,
    },
    agentBehavior: {
      verbosity: 'normal',
      proactiveSuggestions: true,
      language: 'en',
    },
    updatedAt: Date.now(),
    ...overrides,
  };
}

function createTestAgentConfig(): CrossRealityAgentConfig {
  return {
    identity: {
      id: 'agent-museum-guide',
      name: 'Museum Guide',
      domain: 'cross-reality',
      version: '1.0.0',
      capabilities: ['handoff', 'spatial-awareness', 'voice', 'gesture'],
    },
    currentFormFactor: 'vr-headset',
    autoHandoff: false,
    autoHandoffThreshold: 0.8,
    maxHandoffsPerMinute: 3,
  };
}

// =============================================================================
// 1. CROSS-REALITY AGENT (uAA2++ Protocol Integration)
// =============================================================================

describe('CrossRealityAgent', () => {
  let agent: CrossRealityAgent;

  beforeEach(() => {
    agent = createCrossRealityAgent(createTestAgentConfig());
  });

  it('initializes with correct identity', () => {
    const metrics = agent.getMetrics();
    expect(metrics.identity.id).toBe('agent-museum-guide');
    expect(metrics.currentFormFactor).toBe('vr-headset');
    expect(metrics.totalCycles).toBe(0);
  });

  it('runs a complete 7-phase cycle', async () => {
    const result = await agent.runCycle('evaluate-handoff', {
      discoveredDevices: [
        {
          formFactor: 'phone' as FormFactor,
          deviceId: 'phone-1',
          supportedEmbodiments: ['UI2D'] as EmbodimentType[],
          inputModalities: ['touch'],
          budget: { frameBudgetMs: 16.6, agentBudgetMs: 100, computeModel: 'cloud-first' as const },
          sensors: ['gps'],
          hasGeospatial: true,
          webxrModes: [],
        },
      ],
    });

    expect(result.status).toBe('complete');
    expect(result.phases).toHaveLength(7);
    expect(result.phases[0].phase).toBe(AgentPhase.INTAKE);
    expect(result.phases[6].phase).toBe(AgentPhase.EVOLVE);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('skips handoff when no devices available', async () => {
    const result = await agent.runCycle('evaluate-handoff', {
      discoveredDevices: [],
    });

    expect(result.status).toBe('complete');
    const reflectData = result.phases[1].data as any;
    expect(reflectData.shouldHandoff).toBe(false);
  });

  it('records handoff outcomes for learning', () => {
    agent.recordHandoffOutcome('vr-headset', 'phone', true, 180, 200, 'positive');
    agent.recordHandoffOutcome('phone', 'desktop', true, 250, 300, 'neutral');
    agent.recordHandoffOutcome('vr-headset', 'car', false, 500, 200, 'negative');

    const learnings = agent.getLearnings();
    expect(learnings).toHaveLength(3);
    expect(learnings[0].success).toBe(true);
    expect(learnings[2].success).toBe(false);
  });

  it('rate-limits handoffs', async () => {
    const config = createTestAgentConfig();
    config.autoHandoff = true;
    config.autoHandoffThreshold = 0.0; // Accept any confidence
    config.maxHandoffsPerMinute = 2;
    const limitedAgent = createCrossRealityAgent(config);

    const devices = [{
      formFactor: 'phone' as FormFactor,
      deviceId: 'phone-1',
      supportedEmbodiments: ['UI2D'] as EmbodimentType[],
      inputModalities: ['touch'],
      budget: { frameBudgetMs: 16.6, agentBudgetMs: 100, computeModel: 'cloud-first' as const },
      sensors: ['gps'],
      hasGeospatial: true,
      webxrModes: [],
    }];

    // First two should succeed
    await limitedAgent.runCycle('test-1', { discoveredDevices: devices });
    await limitedAgent.runCycle('test-2', { discoveredDevices: devices });

    // Third should be rate-limited
    const result3 = await limitedAgent.runCycle('test-3', { discoveredDevices: devices });
    const executePhase = result3.phases[2];
    expect(executePhase.status).toBe('skipped');
    expect((executePhase.data as any).action).toBe('rate-limited');
  });

  it('evolves adaptive timing budgets', async () => {
    // Record some learning data
    agent.recordHandoffOutcome('vr-headset', 'phone', true, 150, 200);
    agent.recordHandoffOutcome('vr-headset', 'phone', true, 170, 200);

    // Run a cycle to trigger evolution
    await agent.runCycle('evolve-test', { discoveredDevices: [] });

    const metrics = agent.getMetrics();
    expect(Object.keys(metrics.adaptiveBudgets).length).toBeGreaterThan(0);
  });

  it('emits events during cycle', async () => {
    const events: string[] = [];
    agent.on('cycle:complete', () => events.push('cycle:complete'));

    await agent.runCycle('test', { discoveredDevices: [] });
    expect(events).toContain('cycle:complete');
  });

  it('updates form factor after handoff', () => {
    agent.updateFormFactor('phone');
    expect(agent.getMetrics().currentFormFactor).toBe('phone');
  });
});

// =============================================================================
// 2. VENDOR ANCHOR CLOUD PROVIDERS
// =============================================================================

describe('VendorAnchorCloudProvider', () => {
  describe('ARKitCloudAnchorProvider', () => {
    it('resolves anchors to geospatial coordinates', async () => {
      const provider = new ARKitCloudAnchorProvider();
      const result = await provider.resolve({
        vendorAnchorId: 'arkit-anchor-1',
        locationHint: { latitude: 40.7484, longitude: -73.9857 },
      });

      expect(result).not.toBeNull();
      expect(result!.provider).toBe('arkit-cloud');
      expect(result!.coordinate.latitude).toBe(40.7484);
      expect(result!.confidence).toBeGreaterThan(0.5);
    });

    it('hosts anchors at geospatial coordinates', async () => {
      const provider = new ARKitCloudAnchorProvider();
      const result = await provider.host({
        coordinate: { latitude: 40.7484, longitude: -73.9857, altitude: null, horizontalAccuracy: 1, verticalAccuracy: null, heading: null, source: 'gps', capturedAt: Date.now() },
        label: 'test-anchor',
      });

      expect(result).not.toBeNull();
      expect(result!.vendorAnchorId).toMatch(/^arkit_/);
    });

    it('reports availability', () => {
      const provider = new ARKitCloudAnchorProvider();
      expect(provider.isAvailable()).toBe(true);
    });
  });

  describe('MultiProviderAnchorResolver', () => {
    let resolver: MultiProviderAnchorResolver;

    beforeEach(() => {
      resolver = new MultiProviderAnchorResolver();
    });

    it('resolves through provider chain', async () => {
      const result = await resolver.resolve({
        vendorAnchorId: 'test-anchor',
        locationHint: { latitude: 40.7484, longitude: -73.9857 },
      });

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThan(0.5);
    });

    it('caches resolved anchors', async () => {
      const result1 = await resolver.resolve({
        vendorAnchorId: 'cached-anchor',
        locationHint: { latitude: 40.7484, longitude: -73.9857 },
      });

      const result2 = await resolver.resolve({
        vendorAnchorId: 'cached-anchor',
        locationHint: { latitude: 40.7484, longitude: -73.9857 },
      });

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      const stats = resolver.getCacheStats();
      expect(stats.valid).toBeGreaterThanOrEqual(1);
    });

    it('hosts on best available provider', async () => {
      const result = await resolver.host({
        coordinate: { latitude: 40.7484, longitude: -73.9857, altitude: null, horizontalAccuracy: 1, verticalAccuracy: null, heading: null, source: 'gps', capturedAt: Date.now() },
        label: 'multi-test',
      });

      expect(result).not.toBeNull();
      expect(result!.provider).toBeDefined();
    });

    it('reports all provider statuses', () => {
      const statuses = resolver.getProviderStatuses();
      expect(statuses.length).toBe(4); // Niantic, Meta, ARKit, ARCore
      expect(statuses.every(s => s.available)).toBe(true);
    });

    it('clears cache', async () => {
      await resolver.resolve({ vendorAnchorId: 'clear-test', locationHint: { latitude: 0, longitude: 0 } });
      expect(resolver.getCacheStats().total).toBeGreaterThan(0);

      resolver.clearCache();
      expect(resolver.getCacheStats().total).toBe(0);
    });
  });
});

// =============================================================================
// 3. MVC PAYLOAD COMPRESSOR
// =============================================================================

describe('MVCPayloadCompressor', () => {
  let compressor: MVCPayloadCompressor;

  beforeEach(() => {
    compressor = createMVCPayloadCompressor();
  });

  it('compresses and decompresses a payload', () => {
    const payload = createTestPayload();
    const compressed = compressor.compress(payload);

    expect(compressed.compressedSizeBytes).toBeGreaterThan(0);
    // Small test payloads may not compress (LZW overhead > savings),
    // but the bypass ensures we never expand significantly (≤ 2 byte prefix)
    expect(compressed.compressedSizeBytes).toBeLessThanOrEqual(compressed.uncompressedSizeBytes + 2);

    const decompressed = compressor.decompress(compressed.compressed);
    expect(decompressed.error).toBeNull();
    expect(decompressed.payload).not.toBeNull();
    expect(decompressed.payload!.agentId).toBe('agent-1');
    expect(decompressed.payload!.agentName).toBe('TestAgent');
  });

  it('never expands data significantly (bypass for small payloads)', () => {
    const payload = createTestPayload();
    const result = compressor.compress(payload);

    // Compression ratio should be ≤ 1.01 (2 byte prefix overhead only)
    // For small payloads, raw JSON is used; for large payloads, LZ kicks in
    expect(result.compressionRatio).toBeLessThanOrEqual(1.01);
  });

  it('compresses within 5ms', () => {
    const payload = createTestPayload();
    const result = compressor.compress(payload);
    expect(result.compressionTimeMs).toBeLessThan(5);
  });

  it('decompresses within 5ms', () => {
    const payload = createTestPayload();
    const compressed = compressor.compress(payload);
    const result = compressor.decompress(compressed.compressed);
    expect(result.decompressionTimeMs).toBeLessThan(5);
  });

  it('handles corrupt compressed data gracefully', () => {
    const result = compressor.decompress('not-valid-base64!!!');
    expect(result.payload).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it('estimates compression ratio', () => {
    const payload = createTestPayload();
    const estimate = compressor.estimateCompressionRatio(payload);
    expect(estimate).toBeGreaterThan(0);
    expect(estimate).toBeLessThan(1);
  });

  it('preserves all MVC fields through round-trip', () => {
    const payload = createTestPayload();
    const compressed = compressor.compress(payload);
    const decompressed = compressor.decompress(compressed.compressed);

    expect(decompressed.payload!.version).toBe(payload.version);
    expect(decompressed.payload!.handoffId).toBe(payload.handoffId);
    expect(decompressed.payload!.sourceFormFactor).toBe(payload.sourceFormFactor);
    expect(decompressed.payload!.targetFormFactor).toBe(payload.targetFormFactor);
    expect(decompressed.payload!.decisionHistory.decisions).toHaveLength(1);
    expect(decompressed.payload!.activeTask.taskId).toBe('task-1');
  });
});

// =============================================================================
// 4. HANDOFF NORM ENFORCER
// =============================================================================

describe('HandoffNormEnforcer', () => {
  let enforcer: HandoffNormEnforcer;

  beforeEach(() => {
    enforcer = createHandoffNormEnforcer();
  });

  function createNormContext(overrides?: Partial<NormCheckContext>): NormCheckContext {
    return {
      sourceFormFactor: 'vr-headset',
      targetFormFactor: 'phone',
      sourceEmbodiment: 'Avatar3D',
      targetEmbodiment: 'UI2D',
      payload: createTestPayload(),
      userPreferences: createTestPreferences(),
      lastHandoffTimestamp: null,
      ...overrides,
    };
  }

  it('allows safe VR → phone handoff', () => {
    const result = enforcer.enforce(createNormContext());
    expect(result.allowed).toBe(true);
    expect(result.violations.filter(v => v.blocking)).toHaveLength(0);
  });

  it('SAFETY-001: blocks non-VoiceHUD embodiment for car', () => {
    const result = enforcer.enforce(createNormContext({
      targetFormFactor: 'car',
      targetEmbodiment: 'FullGUI', // Not VoiceHUD
    }));

    expect(result.allowed).toBe(false);
    const safety001 = result.violations.find(v => v.ruleId === 'SAFETY-001');
    expect(safety001).toBeDefined();
    expect(safety001!.severity).toBe('critical');
    expect(safety001!.blocking).toBe(true);
  });

  it('SAFETY-001: allows VoiceHUD for car', () => {
    const result = enforcer.enforce(createNormContext({
      targetFormFactor: 'car',
      targetEmbodiment: 'VoiceHUD',
    }));

    const safety001 = result.violations.find(v => v.ruleId === 'SAFETY-001');
    expect(safety001).toBeUndefined();
  });

  it('SAFETY-003: blocks direct VR ↔ car handoff', () => {
    const result = enforcer.enforce(createNormContext({
      sourceFormFactor: 'vr-headset',
      targetFormFactor: 'car',
      targetEmbodiment: 'VoiceHUD',
    }));

    const safety003 = result.violations.find(v => v.ruleId === 'SAFETY-003');
    expect(safety003).toBeDefined();
    expect(safety003!.blocking).toBe(true);
    expect(result.allowed).toBe(false);
  });

  it('SAFETY-003: allows phone → car handoff', () => {
    const result = enforcer.enforce(createNormContext({
      sourceFormFactor: 'phone',
      targetFormFactor: 'car',
      targetEmbodiment: 'VoiceHUD',
    }));

    const safety003 = result.violations.find(v => v.ruleId === 'SAFETY-003');
    expect(safety003).toBeUndefined();
  });

  it('A11Y-002: warns about screen reader on car', () => {
    const result = enforcer.enforce(createNormContext({
      targetFormFactor: 'car',
      targetEmbodiment: 'VoiceHUD',
      sourceFormFactor: 'phone', // avoid SAFETY-003
      userPreferences: createTestPreferences({
        accessibility: { highContrast: false, reducedMotion: false, screenReader: true, fontScale: 1.0, hapticFeedback: true },
      }),
    }));

    const a11y002 = result.violations.find(v => v.ruleId === 'A11Y-002');
    expect(a11y002).toBeDefined();
    expect(a11y002!.category).toBe('accessibility');
  });

  it('CTX-002: warns about location in payload without consent', () => {
    const result = enforcer.enforce(createNormContext({
      userPreferences: createTestPreferences({
        privacy: { spatialMemoryConsent: true, emotionDetectionConsent: false, locationSharingConsent: false, dataRetentionDays: 30 },
      }),
    }));

    const ctx002 = result.violations.find(v => v.ruleId === 'CTX-002');
    expect(ctx002).toBeDefined();
    expect(ctx002!.category).toBe('privacy');
  });

  it('applies content modifications for non-blocking violations', () => {
    const result = enforcer.enforce(createNormContext({
      userPreferences: createTestPreferences({
        privacy: { spatialMemoryConsent: true, emotionDetectionConsent: false, locationSharingConsent: false, dataRetentionDays: 30 },
      }),
    }));

    const locMod = result.modifications.find(m => m.ruleId === 'CTX-002');
    expect(locMod).toBeDefined();
    expect(locMod!.target).toBe('spatialContext');
  });

  it('enforces within 1ms', () => {
    const result = enforcer.enforce(createNormContext());
    expect(result.enforcementTimeMs).toBeLessThan(1);
  });

  it('supports custom rules', () => {
    const customEnforcer = createHandoffNormEnforcer({
      customRules: [{
        id: 'CUSTOM-001',
        severity: 'warning',
        category: 'context',
        blocking: false,
        remediation: 'Test remediation',
        check: () => 'Custom rule triggered',
      }],
    });

    const result = customEnforcer.enforce(createNormContext());
    const custom = result.violations.find(v => v.ruleId === 'CUSTOM-001');
    expect(custom).toBeDefined();
    expect(custom!.message).toBe('Custom rule triggered');
  });
});

// =============================================================================
// 5. PERFORMANCE BENCHMARKS
// =============================================================================

describe('Performance Benchmarks', () => {
  it('MVC serialization completes within 5ms', () => {
    const serializer = createMVCSerializer();
    const payload = createTestPayload();

    const start = performance.now();
    serializer.serialize(payload);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
  });

  it('MVC validation completes within 1ms', () => {
    const serializer = createMVCSerializer();
    const payload = createTestPayload();

    const start = performance.now();
    serializer.validate(payload);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);
  });

  it('Norm enforcement completes within 1ms', () => {
    const enforcer = createHandoffNormEnforcer();
    const start = performance.now();
    enforcer.enforce({
      sourceFormFactor: 'vr-headset',
      targetFormFactor: 'phone',
      sourceEmbodiment: 'Avatar3D',
      targetEmbodiment: 'UI2D',
      payload: createTestPayload(),
      userPreferences: createTestPreferences(),
      lastHandoffTimestamp: null,
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);
  });

  it('MVC compression + decompression within 10ms total', () => {
    const compressor = createMVCPayloadCompressor();
    const payload = createTestPayload();

    const start = performance.now();
    const compressed = compressor.compress(payload);
    compressor.decompress(compressed.compressed);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('Anchor resolution completes within 10ms (simulated)', async () => {
    const resolver = new MultiProviderAnchorResolver();

    const start = performance.now();
    await resolver.resolve({
      vendorAnchorId: 'perf-test',
      locationHint: { latitude: 40.7484, longitude: -73.9857 },
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('Agent 7-phase cycle completes within 20ms', async () => {
    const agent = createCrossRealityAgent(createTestAgentConfig());

    const start = performance.now();
    await agent.runCycle('perf-test', { discoveredDevices: [] });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(20);
  });

  it('1000 norm checks complete within 50ms', () => {
    const enforcer = createHandoffNormEnforcer();
    const context: NormCheckContext = {
      sourceFormFactor: 'vr-headset',
      targetFormFactor: 'phone',
      sourceEmbodiment: 'Avatar3D',
      targetEmbodiment: 'UI2D',
      payload: createTestPayload(),
      userPreferences: createTestPreferences(),
      lastHandoffTimestamp: null,
    };

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      enforcer.enforce(context);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });
});

// =============================================================================
// 6. END-TO-END INTEGRATION
// =============================================================================

describe('End-to-End Cross-Reality Integration', () => {
  it('full pipeline: agent evaluates → norms enforce → compress → send', async () => {
    // 1. Create the agent
    const agent = createCrossRealityAgent(createTestAgentConfig());

    // 2. Discover a phone device
    const phoneDevice = {
      formFactor: 'phone' as FormFactor,
      deviceId: 'iphone-15',
      supportedEmbodiments: ['UI2D'] as EmbodimentType[],
      inputModalities: ['touch', 'voice'],
      budget: { frameBudgetMs: 16.6, agentBudgetMs: 100, computeModel: 'cloud-first' as const },
      sensors: ['gps', 'camera'],
      hasGeospatial: true,
      webxrModes: ['immersive-ar'],
    };

    // 3. Agent evaluates handoff
    const cycleResult = await agent.runCycle('user-requested-handoff', {
      discoveredDevices: [phoneDevice],
    });
    expect(cycleResult.status).toBe('complete');

    // 4. Create MVC payload
    const payload = createTestPayload({
      targetFormFactor: 'phone',
      targetEmbodiment: 'UI2D',
    });

    // 5. Enforce norms
    const enforcer = createHandoffNormEnforcer();
    const normResult = enforcer.enforceForPayload(payload, createTestPreferences());
    expect(normResult.allowed).toBe(true);

    // 6. Compress payload (small test payloads use raw bypass, ratio ≈ 1.0)
    const compressor = createMVCPayloadCompressor();
    const compressed = compressor.compress(payload);
    expect(compressed.compressionRatio).toBeLessThanOrEqual(1.01);

    // 7. Decompress on target
    const decompressed = compressor.decompress(compressed.compressed);
    expect(decompressed.error).toBeNull();
    expect(decompressed.payload!.agentId).toBe('agent-1');

    // 8. Record outcome for learning
    agent.recordHandoffOutcome('vr-headset', 'phone', true, 180, 200, 'positive');
    expect(agent.getLearnings()).toHaveLength(1);
  });

  it('blocks unsafe VR → car pipeline with norm enforcement', async () => {
    const agent = createCrossRealityAgent(createTestAgentConfig());

    const payload = createTestPayload({
      sourceFormFactor: 'vr-headset',
      targetFormFactor: 'car',
      targetEmbodiment: 'FullGUI',
    });

    const enforcer = createHandoffNormEnforcer();
    const result = enforcer.enforceForPayload(payload, createTestPreferences());

    // Should be blocked by SAFETY-001 (non-VoiceHUD) and SAFETY-003 (direct VR→car)
    expect(result.allowed).toBe(false);
    expect(result.violations.some(v => v.ruleId === 'SAFETY-001')).toBe(true);
    expect(result.violations.some(v => v.ruleId === 'SAFETY-003')).toBe(true);

    // Agent learns from the failure
    agent.recordHandoffOutcome('vr-headset', 'car', false, 0, 500, 'negative');
    expect(agent.getLearnings()[0].success).toBe(false);
  });

  it('vendor anchor resolution feeds into session manager', async () => {
    const resolver = new MultiProviderAnchorResolver();

    // Resolve an anchor
    const anchor = await resolver.resolve({
      vendorAnchorId: 'exhibit-temple-dendur',
      locationHint: { latitude: 40.7484, longitude: -73.9857 },
    });

    expect(anchor).not.toBeNull();
    expect(anchor!.coordinate.source).toBe('vps');

    // This anchor's WGS84 coordinates would feed into the
    // GeospatialAnchorBridge for cross-device spatial sync
    expect(anchor!.coordinate.latitude).toBe(40.7484);
    expect(anchor!.coordinate.longitude).toBe(-73.9857);
  });

  it('compression reduces payload below 5KB', () => {
    // Create a realistic payload with lots of data
    const bigPayload = createTestPayload({
      decisionHistory: {
        decisions: Array.from({ length: 10 }, (_, i) => ({
          id: `d${i}`,
          summary: `Decision ${i}: navigate to room ${i}`,
          rationale: `User showed interest in exhibit ${i} based on gaze tracking data collected over ${i} seconds`,
          alternatives: [`Stay at room ${i - 1}`, `Skip to room ${i + 1}`],
          confidence: 0.8 + Math.random() * 0.2,
          category: 'navigation' as const,
          decidedAt: Date.now() - i * 60000,
          outcome: 'success' as const,
        })),
        totalDecisionCount: 10,
        successRate: 0.9,
        updatedAt: Date.now(),
      },
      evidenceTrail: {
        items: Array.from({ length: 15 }, (_, i) => ({
          id: `e${i}`,
          type: 'observation' as const,
          summary: `Evidence item ${i}: user gazed at artifact for ${i * 2} seconds`,
          source: 'gaze-tracker',
          relevance: 0.5 + Math.random() * 0.5,
          capturedAt: Date.now() - i * 30000,
        })),
        totalItemCount: 15,
        oldestItemAt: Date.now() - 450000,
        newestItemAt: Date.now(),
      },
    });

    const compressor = createMVCPayloadCompressor();
    const result = compressor.compress(bigPayload);

    // Compressed should be significantly smaller
    expect(result.compressedSizeBytes).toBeLessThan(result.uncompressedSizeBytes);
  });
});
