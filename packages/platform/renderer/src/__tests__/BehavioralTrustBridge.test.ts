/**
 * @vitest-environment jsdom
 */

/**
 * Tests for BehavioralTrustBridge
 *
 * Validates the bridge between AgentStateBuffer observations and
 * BehavioralTrustScoring event generation:
 * - Position event generation from avatar state changes
 * - Velocity calculation from consecutive position samples
 * - Impossible movement (speed hack) detection
 * - Zone boundary entry/exit events
 * - Chat message detection from speechText changes
 * - Heartbeat event generation from lastUpdateTimestamp
 * - World bounds violation detection
 * - Lifecycle: start/stop/dispose
 * - Metrics tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  BehavioralTrustBridge,
  createBehavioralTrustBridge,
  type BehavioralTrustBridgeConfig,
  type BoundingBox,
  type ZoneDefinition,
} from '../BehavioralTrustBridge';

import {
  AgentStateBuffer,
  createEmptyAgentWorldState,
  createDefaultAgentAvatarState,
  type AgentWorldState,
} from '../AgentStateBuffer';

import {
  BehavioralTrustScoring,
  type BehavioralEvent,
} from '../BehavioralTrustScoring';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestBuffer(): AgentStateBuffer<AgentWorldState> {
  return new AgentStateBuffer<AgentWorldState>(createEmptyAgentWorldState, 500);
}

function createTestScoring(): BehavioralTrustScoring {
  return new BehavioralTrustScoring({ autoStart: false });
}

function createTestBridge(
  buffer: AgentStateBuffer<AgentWorldState>,
  scoring: BehavioralTrustScoring,
  config?: Partial<BehavioralTrustBridgeConfig>,
): BehavioralTrustBridge {
  return new BehavioralTrustBridge(buffer, scoring, {
    autoStart: false,
    observationHz: 5,
    ...config,
  });
}

/**
 * Add an agent to the back buffer and swap to make it visible in the front buffer.
 */
function addAgentToBuffer(
  buffer: AgentStateBuffer<AgentWorldState>,
  agentId: string,
  overrides?: Partial<{
    position: { x: number; y: number; z: number };
    speechText: string;
    lastUpdateTimestamp: number;
  }>,
): void {
  const back = buffer.getBackBuffer();
  const state = createDefaultAgentAvatarState(agentId);
  if (overrides?.position) {
    state.position = overrides.position;
  }
  if (overrides?.speechText !== undefined) {
    state.speechText = overrides.speechText;
  }
  if (overrides?.lastUpdateTimestamp !== undefined) {
    state.lastUpdateTimestamp = overrides.lastUpdateTimestamp;
  }
  back.agents[agentId] = state;
  buffer.swap();
}

/**
 * Update an agent's position in the back buffer and swap.
 */
function updateAgentPosition(
  buffer: AgentStateBuffer<AgentWorldState>,
  agentId: string,
  position: { x: number; y: number; z: number },
  lastUpdateTimestamp?: number,
): void {
  const back = buffer.getBackBuffer();
  if (back.agents[agentId]) {
    back.agents[agentId].position = position;
    if (lastUpdateTimestamp !== undefined) {
      back.agents[agentId].lastUpdateTimestamp = lastUpdateTimestamp;
    }
  }
  buffer.swap();
}

/**
 * Update an agent's speechText in the back buffer and swap.
 */
function updateAgentSpeech(
  buffer: AgentStateBuffer<AgentWorldState>,
  agentId: string,
  speechText: string,
  lastUpdateTimestamp?: number,
): void {
  const back = buffer.getBackBuffer();
  if (back.agents[agentId]) {
    back.agents[agentId].speechText = speechText;
    if (lastUpdateTimestamp !== undefined) {
      back.agents[agentId].lastUpdateTimestamp = lastUpdateTimestamp;
    }
  }
  buffer.swap();
}

// =============================================================================
// TESTS
// =============================================================================

describe('BehavioralTrustBridge', () => {
  let buffer: AgentStateBuffer<AgentWorldState>;
  let scoring: BehavioralTrustScoring;
  let bridge: BehavioralTrustBridge;

  beforeEach(() => {
    vi.useFakeTimers();
    buffer = createTestBuffer();
    scoring = createTestScoring();
  });

  afterEach(() => {
    bridge?.dispose();
    scoring?.dispose();
    vi.useRealTimers();
  });

  // ===========================================================================
  // INITIALIZATION & LIFECYCLE
  // ===========================================================================

  describe('initialization & lifecycle', () => {
    it('should create with default configuration', () => {
      bridge = createTestBridge(buffer, scoring);
      expect(bridge.getIsRunning()).toBe(false);
      expect(bridge.getObservationHz()).toBe(5);
      expect(bridge.getWorldBounds()).toBeNull();
      expect(bridge.getZones()).toEqual([]);
      expect(bridge.getMaxVelocityThreshold()).toBe(20);
    });

    it('should auto-start when configured', () => {
      bridge = createTestBridge(buffer, scoring, { autoStart: true });
      expect(bridge.getIsRunning()).toBe(true);
    });

    it('should start and stop the observation loop', () => {
      bridge = createTestBridge(buffer, scoring);
      expect(bridge.getIsRunning()).toBe(false);

      bridge.start();
      expect(bridge.getIsRunning()).toBe(true);

      bridge.stop();
      expect(bridge.getIsRunning()).toBe(false);
    });

    it('should not start twice', () => {
      bridge = createTestBridge(buffer, scoring);
      bridge.start();
      bridge.start(); // Should warn but not error
      expect(bridge.getIsRunning()).toBe(true);
    });

    it('should not stop when not running', () => {
      bridge = createTestBridge(buffer, scoring);
      bridge.stop(); // Should warn but not error
      expect(bridge.getIsRunning()).toBe(false);
    });

    it('should dispose and clear all observation state', () => {
      bridge = createTestBridge(buffer, scoring);
      bridge.start();

      addAgentToBuffer(buffer, 'agent-1');
      bridge.observationTick(); // First tick creates observation

      expect(bridge.getMetrics().observedAgentCount).toBe(1);

      bridge.dispose();
      expect(bridge.getIsRunning()).toBe(false);
      expect(bridge.getMetrics().observedAgentCount).toBe(0);
    });

    it('should accept custom world bounds', () => {
      const worldBounds: BoundingBox = {
        min: { x: -100, y: -10, z: -100 },
        max: { x: 100, y: 100, z: 100 },
      };
      bridge = createTestBridge(buffer, scoring, { worldBounds });
      expect(bridge.getWorldBounds()).toEqual(worldBounds);
    });

    it('should accept custom zone definitions', () => {
      const zones: ZoneDefinition[] = [
        {
          id: 'admin',
          name: 'Admin Zone',
          bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 10 } },
          restricted: true,
        },
      ];
      bridge = createTestBridge(buffer, scoring, { zones });
      expect(bridge.getZones()).toHaveLength(1);
      expect(bridge.getZones()[0].id).toBe('admin');
    });

    it('should create via factory function', () => {
      bridge = createBehavioralTrustBridge(buffer, scoring, { observationHz: 10 });
      expect(bridge).toBeInstanceOf(BehavioralTrustBridge);
      expect(bridge.getObservationHz()).toBe(10);
    });
  });

  // ===========================================================================
  // POSITION EVENT GENERATION
  // ===========================================================================

  describe('position event generation', () => {
    it('should generate position_update events when position changes', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      // Add agent at origin
      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick(); // First tick: baseline, no events

      // Move agent
      updateAgentPosition(buffer, 'agent-1', { x: 5, y: 0, z: 0 });
      bridge.observationTick(); // Second tick: should generate position_update

      const positionEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'position_update',
      );
      expect(positionEvents.length).toBe(1);
      expect(positionEvents[0][0].data.position).toEqual({ x: 5, y: 0, z: 0 });
    });

    it('should NOT generate position_update when position is unchanged', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 5, y: 0, z: 0 } });
      bridge.observationTick(); // Baseline

      // No position change -- just swap again (same position)
      buffer.swap();
      bridge.observationTick();

      const positionEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'position_update',
      );
      expect(positionEvents.length).toBe(0);
    });

    it('should generate events for multiple agents independently', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      // Add two agents
      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      addAgentToBuffer(buffer, 'agent-2', { position: { x: 10, y: 0, z: 0 } });
      bridge.observationTick(); // Baseline

      // Move both agents
      updateAgentPosition(buffer, 'agent-1', { x: 1, y: 0, z: 0 });
      updateAgentPosition(buffer, 'agent-2', { x: 11, y: 0, z: 0 });
      bridge.observationTick();

      const agent1Events = ingestSpy.mock.calls.filter(
        ([event]) => event.agentId === 'agent-1' && event.type === 'position_update',
      );
      const agent2Events = ingestSpy.mock.calls.filter(
        ([event]) => event.agentId === 'agent-2' && event.type === 'position_update',
      );
      expect(agent1Events.length).toBe(1);
      expect(agent2Events.length).toBe(1);
    });

    it('should clean up observations for disconnected agents', () => {
      bridge = createTestBridge(buffer, scoring);

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();
      expect(bridge.getMetrics().observedAgentCount).toBe(1);

      // Remove agent from buffer
      const back = buffer.getBackBuffer();
      delete back.agents['agent-1'];
      buffer.swap();
      bridge.observationTick();

      expect(bridge.getMetrics().observedAgentCount).toBe(0);
    });
  });

  // ===========================================================================
  // VELOCITY CALCULATION
  // ===========================================================================

  describe('velocity calculation', () => {
    it('should calculate velocity from consecutive positions', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      // Agent starts at origin
      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick(); // Baseline at t=0

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);

      // Move 10 units along X axis
      updateAgentPosition(buffer, 'agent-1', { x: 10, y: 0, z: 0 });
      bridge.observationTick(); // Should compute velocity = 10 units / 1 sec = 10 u/s

      const velocityEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'velocity_report',
      );
      expect(velocityEvents.length).toBe(1);
      expect(velocityEvents[0][0].data.velocity).toBeCloseTo(10, 0);
    });

    it('should generate velocity_report alongside position_update', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();

      vi.advanceTimersByTime(500);
      updateAgentPosition(buffer, 'agent-1', { x: 5, y: 0, z: 0 });
      bridge.observationTick();

      const eventTypes = ingestSpy.mock.calls.map(([event]) => event.type);
      expect(eventTypes).toContain('position_update');
      expect(eventTypes).toContain('velocity_report');
    });
  });

  // ===========================================================================
  // IMPOSSIBLE MOVEMENT DETECTION
  // ===========================================================================

  describe('impossible movement detection', () => {
    it('should detect impossible movement (speed hack)', () => {
      bridge = createTestBridge(buffer, scoring, {
        maxVelocityThreshold: 20,
      });
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();

      // Advance 200ms
      vi.advanceTimersByTime(200);

      // Move 100 units in 0.2 seconds = 500 u/s (way above 20 u/s threshold)
      updateAgentPosition(buffer, 'agent-1', { x: 100, y: 0, z: 0 });
      bridge.observationTick();

      const impossibleEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'impossible_movement',
      );
      expect(impossibleEvents.length).toBe(1);
      expect(impossibleEvents[0][0].data.velocity).toBeGreaterThan(20);
      expect(impossibleEvents[0][0].data.maxAllowed).toBe(20);
    });

    it('should NOT flag normal movement as impossible', () => {
      bridge = createTestBridge(buffer, scoring, {
        maxVelocityThreshold: 20,
      });
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();

      // Advance 1 second
      vi.advanceTimersByTime(1000);

      // Move 5 units in 1 second = 5 u/s (well under 20 u/s threshold)
      updateAgentPosition(buffer, 'agent-1', { x: 5, y: 0, z: 0 });
      bridge.observationTick();

      const impossibleEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'impossible_movement',
      );
      expect(impossibleEvents.length).toBe(0);
    });

    it('should track total impossible movements in metrics', () => {
      bridge = createTestBridge(buffer, scoring, {
        maxVelocityThreshold: 10,
      });

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();

      vi.advanceTimersByTime(100);
      updateAgentPosition(buffer, 'agent-1', { x: 200, y: 0, z: 0 }); // Speed hack
      bridge.observationTick();

      vi.advanceTimersByTime(100);
      updateAgentPosition(buffer, 'agent-1', { x: 500, y: 0, z: 0 }); // Another speed hack
      bridge.observationTick();

      expect(bridge.getMetrics().totalImpossibleMovements).toBe(2);
    });
  });

  // ===========================================================================
  // WORLD BOUNDS VIOLATIONS
  // ===========================================================================

  describe('world bounds violations', () => {
    const worldBounds: BoundingBox = {
      min: { x: -50, y: -10, z: -50 },
      max: { x: 50, y: 100, z: 50 },
    };

    it('should detect bounds violations', () => {
      bridge = createTestBridge(buffer, scoring, { worldBounds });
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      // Agent starts inside bounds
      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();

      // Move outside bounds
      vi.advanceTimersByTime(200);
      updateAgentPosition(buffer, 'agent-1', { x: 100, y: 0, z: 0 });
      bridge.observationTick();

      const boundsEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'bounds_violation',
      );
      expect(boundsEvents.length).toBe(1);
    });

    it('should NOT flag positions inside bounds', () => {
      bridge = createTestBridge(buffer, scoring, { worldBounds });
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();

      vi.advanceTimersByTime(200);
      updateAgentPosition(buffer, 'agent-1', { x: 25, y: 5, z: -10 }); // Inside
      bridge.observationTick();

      const boundsEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'bounds_violation',
      );
      expect(boundsEvents.length).toBe(0);
    });

    it('should track bounds violations in metrics', () => {
      bridge = createTestBridge(buffer, scoring, { worldBounds });

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();

      vi.advanceTimersByTime(200);
      updateAgentPosition(buffer, 'agent-1', { x: 200, y: 0, z: 0 });
      bridge.observationTick();

      expect(bridge.getMetrics().totalBoundsViolations).toBe(1);
    });
  });

  // ===========================================================================
  // ZONE BOUNDARY EVENTS
  // ===========================================================================

  describe('zone boundary events', () => {
    const zones: ZoneDefinition[] = [
      {
        id: 'restricted-zone',
        name: 'Restricted Area',
        bounds: { min: { x: 10, y: 0, z: 10 }, max: { x: 20, y: 5, z: 20 } },
        restricted: true,
      },
      {
        id: 'public-zone',
        name: 'Public Area',
        bounds: { min: { x: -20, y: 0, z: -20 }, max: { x: -10, y: 5, z: -10 } },
        restricted: false,
      },
    ];

    it('should generate zone_entry event when agent enters a zone', () => {
      bridge = createTestBridge(buffer, scoring, { zones });
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      // Agent starts outside all zones
      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();

      // Move into restricted zone
      vi.advanceTimersByTime(200);
      updateAgentPosition(buffer, 'agent-1', { x: 15, y: 1, z: 15 });
      bridge.observationTick();

      const zoneEntryEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'zone_entry',
      );
      expect(zoneEntryEvents.length).toBe(1);
      expect(zoneEntryEvents[0][0].data.zoneId).toBe('restricted-zone');
      expect(zoneEntryEvents[0][0].data.restricted).toBe(true);
    });

    it('should generate zone_exit event when agent leaves a zone', () => {
      bridge = createTestBridge(buffer, scoring, { zones });
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      // Agent starts inside restricted zone
      addAgentToBuffer(buffer, 'agent-1', { position: { x: 15, y: 1, z: 15 } });
      bridge.observationTick();

      // Move out of restricted zone
      vi.advanceTimersByTime(200);
      updateAgentPosition(buffer, 'agent-1', { x: 0, y: 0, z: 0 });
      bridge.observationTick();

      const zoneExitEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'zone_exit',
      );
      expect(zoneExitEvents.length).toBe(1);
      expect(zoneExitEvents[0][0].data.zoneId).toBe('restricted-zone');
    });

    it('should detect movement between zones', () => {
      bridge = createTestBridge(buffer, scoring, { zones });
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      // Start in restricted zone
      addAgentToBuffer(buffer, 'agent-1', { position: { x: 15, y: 1, z: 15 } });
      bridge.observationTick();

      // Move to public zone
      vi.advanceTimersByTime(200);
      updateAgentPosition(buffer, 'agent-1', { x: -15, y: 1, z: -15 });
      bridge.observationTick();

      const zoneEntryEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'zone_entry',
      );
      const zoneExitEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'zone_exit',
      );

      // Should exit restricted-zone and enter public-zone
      expect(zoneExitEvents.length).toBe(1);
      expect(zoneExitEvents[0][0].data.zoneId).toBe('restricted-zone');
      expect(zoneEntryEvents.length).toBe(1);
      expect(zoneEntryEvents[0][0].data.zoneId).toBe('public-zone');
    });

    it('should NOT generate zone events when staying in the same zone', () => {
      bridge = createTestBridge(buffer, scoring, { zones });
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      // Start in restricted zone
      addAgentToBuffer(buffer, 'agent-1', { position: { x: 15, y: 1, z: 15 } });
      bridge.observationTick();

      // Move within restricted zone
      vi.advanceTimersByTime(200);
      updateAgentPosition(buffer, 'agent-1', { x: 16, y: 1, z: 16 });
      bridge.observationTick();

      const zoneEntryEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'zone_entry',
      );
      const zoneExitEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'zone_exit',
      );

      expect(zoneEntryEvents.length).toBe(0);
      expect(zoneExitEvents.length).toBe(0);
    });

    it('should track zone entries and exits in metrics', () => {
      bridge = createTestBridge(buffer, scoring, { zones });

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();

      // Enter restricted zone
      vi.advanceTimersByTime(200);
      updateAgentPosition(buffer, 'agent-1', { x: 15, y: 1, z: 15 });
      bridge.observationTick();

      // Exit restricted zone
      vi.advanceTimersByTime(200);
      updateAgentPosition(buffer, 'agent-1', { x: 0, y: 0, z: 0 });
      bridge.observationTick();

      expect(bridge.getMetrics().totalZoneEntries).toBe(1);
      expect(bridge.getMetrics().totalZoneExits).toBe(1);
    });
  });

  // ===========================================================================
  // CHAT MESSAGE DETECTION
  // ===========================================================================

  describe('chat message detection', () => {
    it('should generate chat_message event when speechText changes', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      addAgentToBuffer(buffer, 'agent-1', { speechText: '' });
      bridge.observationTick();

      // Agent says something
      updateAgentSpeech(buffer, 'agent-1', 'Hello world!');
      bridge.observationTick();

      const chatEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'chat_message',
      );
      expect(chatEvents.length).toBe(1);
      expect(chatEvents[0][0].data.text).toBe('Hello world!');
    });

    it('should NOT generate chat_message when speechText is unchanged', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      addAgentToBuffer(buffer, 'agent-1', { speechText: 'Hello' });
      bridge.observationTick();

      // Same text
      buffer.swap();
      bridge.observationTick();

      const chatEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'chat_message',
      );
      expect(chatEvents.length).toBe(0);
    });

    it('should NOT generate chat_message when speechText becomes empty', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      addAgentToBuffer(buffer, 'agent-1', { speechText: 'Hello' });
      bridge.observationTick();

      // Text cleared (speech bubble dismissed)
      updateAgentSpeech(buffer, 'agent-1', '');
      bridge.observationTick();

      const chatEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'chat_message',
      );
      expect(chatEvents.length).toBe(0);
    });

    it('should generate multiple chat events for consecutive messages', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      addAgentToBuffer(buffer, 'agent-1', { speechText: '' });
      bridge.observationTick();

      updateAgentSpeech(buffer, 'agent-1', 'First message');
      bridge.observationTick();

      updateAgentSpeech(buffer, 'agent-1', 'Second message');
      bridge.observationTick();

      const chatEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'chat_message',
      );
      expect(chatEvents.length).toBe(2);
      expect(chatEvents[0][0].data.text).toBe('First message');
      expect(chatEvents[1][0].data.text).toBe('Second message');
    });
  });

  // ===========================================================================
  // HEARTBEAT TIMING
  // ===========================================================================

  describe('heartbeat timing', () => {
    it('should generate heartbeat events when lastUpdateTimestamp advances', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      const now = Date.now();
      addAgentToBuffer(buffer, 'agent-1', { lastUpdateTimestamp: now });
      bridge.observationTick();

      // Update timestamp advances (agent sent a state update)
      const back = buffer.getBackBuffer();
      back.agents['agent-1'].lastUpdateTimestamp = now + 5000;
      buffer.swap();
      bridge.observationTick();

      const heartbeatEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'heartbeat',
      );
      expect(heartbeatEvents.length).toBe(1);
      expect(heartbeatEvents[0][0].data.updateGap).toBe(5000);
    });

    it('should NOT generate heartbeat when lastUpdateTimestamp is unchanged', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      const now = Date.now();
      addAgentToBuffer(buffer, 'agent-1', { lastUpdateTimestamp: now });
      bridge.observationTick();

      // No timestamp change
      buffer.swap();
      bridge.observationTick();

      const heartbeatEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'heartbeat',
      );
      expect(heartbeatEvents.length).toBe(0);
    });

    it('should NOT generate heartbeat when update gap exceeds staleness threshold', () => {
      bridge = createTestBridge(buffer, scoring, {
        heartbeatStalenessMs: 5000,
      });
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      const now = Date.now();
      addAgentToBuffer(buffer, 'agent-1', { lastUpdateTimestamp: now });
      bridge.observationTick();

      // Very large gap (stale)
      const back = buffer.getBackBuffer();
      back.agents['agent-1'].lastUpdateTimestamp = now + 20_000;
      buffer.swap();
      bridge.observationTick();

      const heartbeatEvents = ingestSpy.mock.calls.filter(
        ([event]) => event.type === 'heartbeat',
      );
      expect(heartbeatEvents.length).toBe(0);
    });
  });

  // ===========================================================================
  // OBSERVATION LOOP TIMING
  // ===========================================================================

  describe('observation loop timing', () => {
    it('should run observation ticks at configured frequency', () => {
      bridge = createTestBridge(buffer, scoring, { observationHz: 5 });

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });

      bridge.start();

      // At 5Hz, interval is 200ms. Advance 1 second = 5 ticks
      vi.advanceTimersByTime(1000);

      expect(bridge.getMetrics().totalTicks).toBe(5);
    });

    it('should stop generating events after stop()', () => {
      bridge = createTestBridge(buffer, scoring);
      const ingestSpy = vi.spyOn(scoring, 'ingestEvent');

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });

      bridge.start();
      vi.advanceTimersByTime(200); // 1 tick

      bridge.stop();
      const eventsAfterStop = ingestSpy.mock.calls.length;

      // Move agent and advance time -- should NOT generate events
      updateAgentPosition(buffer, 'agent-1', { x: 50, y: 0, z: 0 });
      vi.advanceTimersByTime(1000);

      expect(ingestSpy.mock.calls.length).toBe(eventsAfterStop);
    });
  });

  // ===========================================================================
  // METRICS
  // ===========================================================================

  describe('metrics', () => {
    it('should track total ticks', () => {
      bridge = createTestBridge(buffer, scoring);

      addAgentToBuffer(buffer, 'agent-1');
      bridge.observationTick();
      bridge.observationTick();
      bridge.observationTick();

      expect(bridge.getMetrics().totalTicks).toBe(3);
    });

    it('should track total events generated', () => {
      bridge = createTestBridge(buffer, scoring);

      addAgentToBuffer(buffer, 'agent-1', { position: { x: 0, y: 0, z: 0 } });
      bridge.observationTick();

      vi.advanceTimersByTime(200);
      updateAgentPosition(buffer, 'agent-1', { x: 5, y: 0, z: 0 });
      bridge.observationTick();

      // position_update + velocity_report + heartbeat (if timestamp advanced)
      expect(bridge.getMetrics().totalEventsGenerated).toBeGreaterThanOrEqual(2);
    });

    it('should track observed agent count', () => {
      bridge = createTestBridge(buffer, scoring);

      addAgentToBuffer(buffer, 'agent-1');
      addAgentToBuffer(buffer, 'agent-2');
      bridge.observationTick();

      expect(bridge.getMetrics().observedAgentCount).toBe(2);
    });

    it('should report running state', () => {
      bridge = createTestBridge(buffer, scoring);
      expect(bridge.getMetrics().isRunning).toBe(false);

      bridge.start();
      expect(bridge.getMetrics().isRunning).toBe(true);

      bridge.stop();
      expect(bridge.getMetrics().isRunning).toBe(false);
    });

    it('should report observation Hz', () => {
      bridge = createTestBridge(buffer, scoring, { observationHz: 10 });
      expect(bridge.getMetrics().observationHz).toBe(10);
    });
  });

  // ===========================================================================
  // INTEGRATION SCENARIO
  // ===========================================================================

  describe('integration scenario', () => {
    it('should feed events that affect BehavioralTrustScoring composite score', () => {
      const worldBounds: BoundingBox = {
        min: { x: -100, y: -10, z: -100 },
        max: { x: 100, y: 100, z: 100 },
      };

      bridge = createTestBridge(buffer, scoring, {
        worldBounds,
        maxVelocityThreshold: 20,
      });

      // Start the scoring engine
      scoring.start();

      // Add well-behaved agent
      addAgentToBuffer(buffer, 'agent-1', {
        position: { x: 0, y: 0, z: 0 },
        lastUpdateTimestamp: Date.now(),
      });
      bridge.observationTick();

      // Normal movement
      vi.advanceTimersByTime(1000);
      updateAgentPosition(buffer, 'agent-1', { x: 5, y: 0, z: 0 }, Date.now());
      bridge.observationTick();

      // Process scoring cycle
      vi.advanceTimersByTime(200);

      // Score should remain high (agent is well-behaved)
      const score = scoring.getAgentScore('agent-1');
      expect(score).toBeGreaterThan(0.8);

      scoring.stop();
    });
  });
});
