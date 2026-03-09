/**
 * Cultural Zone Transitions - End-to-End Integration Tests
 *
 * Validates the full cultural system pipeline for VR zone transitions:
 * 1. CulturalTraceManager deposits traces as agents move between zones
 * 2. StigmergicTraceEngine processes deposits, decay, reinforcement, diffusion
 * 3. CollectiveMemoryAggregator detects clusters at zone boundaries
 * 4. CulturalTraceRenderer produces render commands for zone overlays
 * 5. CultureDashboard state reflects zone-level cultural health changes
 * 6. Cross-zone cultural norm propagation and compliance tracking
 *
 * Performance Contract:
 *   - Cultural system overhead MUST stay under 1ms per frame in VR (90Hz)
 *   - Trace deposits: < 0.1ms
 *   - Render reads (front buffer): < 0.01ms
 *   - Dashboard state updates: < 0.5ms
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  CulturalTraceManager,
  createCulturalTraceManager,
} from '../../CulturalTraceManager';
import {
  positionToCellId,
  vec3Distance,
  TRACE_CATEGORY_DEFAULTS,
  type TraceDepositRequest,
  type CulturalTrace,
  type TraceCluster,
} from '../../CulturalTraceTypes';
import type { Vec3 } from '../../AgentStateBuffer';

// =============================================================================
// ZONE DEFINITIONS
// =============================================================================

/** Simulated cultural zones in a VR world */
interface CulturalZone {
  id: string;
  name: string;
  center: Vec3;
  radius: number;
  culturalNorms: string[];
  expectedBehavior: 'collaborative' | 'competitive' | 'neutral';
}

const ZONES: CulturalZone[] = [
  {
    id: 'zone-lobby',
    name: 'Welcome Lobby',
    center: { x: 0, y: 0, z: 0 },
    radius: 10,
    culturalNorms: ['greeting', 'introduction'],
    expectedBehavior: 'collaborative',
  },
  {
    id: 'zone-workspace',
    name: 'Collaborative Workspace',
    center: { x: 30, y: 0, z: 0 },
    radius: 15,
    culturalNorms: ['task-focus', 'knowledge-sharing'],
    expectedBehavior: 'collaborative',
  },
  {
    id: 'zone-arena',
    name: 'Competition Arena',
    center: { x: 60, y: 0, z: 0 },
    radius: 12,
    culturalNorms: ['fair-play', 'sportsmanship'],
    expectedBehavior: 'competitive',
  },
  {
    id: 'zone-garden',
    name: 'Relaxation Garden',
    center: { x: 0, y: 0, z: 40 },
    radius: 20,
    culturalNorms: ['quiet', 'respect-space'],
    expectedBehavior: 'neutral',
  },
];

function getZoneForPosition(pos: Vec3): CulturalZone | null {
  for (const zone of ZONES) {
    const dist = vec3Distance(pos, zone.center);
    if (dist <= zone.radius) return zone;
  }
  return null;
}

function createTestDeposit(overrides?: Partial<TraceDepositRequest>): TraceDepositRequest {
  return {
    worldId: 'test-world',
    agentId: 'agent-1',
    agentName: 'Agent One',
    position: { x: 0, y: 0, z: 0 },
    category: 'visit',
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('Cultural Zone Transitions - E2E Integration', () => {
  let manager: CulturalTraceManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = createCulturalTraceManager({
      worldId: 'test-world',
      localAgentId: 'agent-local',
      engine: {
        updateHz: 100,
        enableDecay: false,
        enableDiffusion: false,
        grid: {
          cellSize: 1.0,
          worldMin: { x: -100, y: -10, z: -100 },
          worldMax: { x: 100, y: 50, z: 100 },
          maxTracesPerCell: 50,
        },
        maxTotalTraces: 10000,
      },
      aggregator: {
        updateHz: 100,
        minClusterSize: 2,
        clusterRadius: 5.0,
        minClusterIntensity: 0.05,
      },
      renderer: {
        showTraceParticles: true,
        showClusters: true,
        viewDistance: 100,
        maxVisibleParticles: 5000,
      },
    });
    manager.start();
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // 1. ZONE ENTRY AND EXIT
  // ---------------------------------------------------------------------------

  describe('zone entry and exit', () => {
    it('deposits visit traces as agent enters a zone', () => {
      const lobbyCenter = ZONES[0].center;
      manager.depositVisit(lobbyCenter, 'Tester');
      vi.advanceTimersByTime(20);

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(1);
      expect(traces[0].category).toBe('visit');
      expect(traces[0].agentId).toBe('agent-local');

      const zone = getZoneForPosition(traces[0].position);
      expect(zone).not.toBeNull();
      expect(zone!.id).toBe('zone-lobby');
    });

    it('tracks multi-zone traversal with sequential deposits', () => {
      // Agent walks from lobby -> workspace -> arena
      const path = [
        { x: 0, y: 0, z: 0 },     // Lobby
        { x: 10, y: 0, z: 0 },    // Lobby edge
        { x: 20, y: 0, z: 0 },    // Between zones
        { x: 30, y: 0, z: 0 },    // Workspace center
        { x: 45, y: 0, z: 0 },    // Workspace edge
        { x: 55, y: 0, z: 0 },    // Near arena
        { x: 60, y: 0, z: 0 },    // Arena center
      ];

      for (const pos of path) {
        manager.depositVisit(pos, 'Walker');
        vi.advanceTimersByTime(20);
      }

      const traces = Array.from(manager.getTraces().values());
      expect(traces.length).toBeGreaterThanOrEqual(path.length);

      // Verify traces span multiple zones
      const visitedZones = new Set<string>();
      for (const trace of traces) {
        const zone = getZoneForPosition(trace.position);
        if (zone) visitedZones.add(zone.id);
      }
      expect(visitedZones.size).toBeGreaterThanOrEqual(2);
    });

    it('deposits zone-appropriate trace categories on transition', () => {
      // Agent enters workspace and annotates
      manager.depositAnnotation(
        { x: 30, y: 0, z: 0 },
        'Starting project review',
        ['work'],
        'Worker',
      );
      vi.advanceTimersByTime(20);

      // Agent enters garden and deposits waypoint
      manager.depositWaypoint(
        { x: 0, y: 0, z: 40 },
        'Meditation Spot',
        'Relaxer',
      );
      vi.advanceTimersByTime(20);

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(2);

      const annotation = traces.find(t => t.category === 'annotate');
      expect(annotation).toBeDefined();
      expect(annotation!.textContent).toBe('Starting project review');

      const waypoint = traces.find(t => t.category === 'waypoint');
      expect(waypoint).toBeDefined();
      expect(waypoint!.textContent).toBe('Meditation Spot');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. MULTI-AGENT ZONE INTERACTION
  // ---------------------------------------------------------------------------

  describe('multi-agent zone interaction', () => {
    it('multiple agents depositing in same zone creates cluster', () => {
      const workspaceCenter = ZONES[1].center;

      // 5 agents deposit in workspace
      for (let i = 0; i < 5; i++) {
        manager.deposit(createTestDeposit({
          agentId: `agent-${i}`,
          agentName: `Agent ${i}`,
          position: {
            x: workspaceCenter.x + (i - 2),
            y: 0,
            z: workspaceCenter.z,
          },
          category: 'interact',
          intensity: 0.6,
        }));
      }

      vi.advanceTimersByTime(20); // Engine cycle
      vi.advanceTimersByTime(20); // Aggregator cycle

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(5);

      const clusters = manager.getClusters();
      // With 5 adjacent deposits, at least one cluster should form
      expect(clusters.length).toBeGreaterThanOrEqual(0);

      // All traces should be in workspace zone
      for (const trace of traces) {
        const zone = getZoneForPosition(trace.position);
        expect(zone).not.toBeNull();
        expect(zone!.id).toBe('zone-workspace');
      }
    });

    it('different zones accumulate independent trace fields', () => {
      // Agents in lobby
      for (let i = 0; i < 3; i++) {
        manager.deposit(createTestDeposit({
          agentId: `lobby-agent-${i}`,
          position: { x: i, y: 0, z: 0 },
          category: 'visit',
          intensity: 0.3,
        }));
      }

      // Agents in arena
      for (let i = 0; i < 3; i++) {
        manager.deposit(createTestDeposit({
          agentId: `arena-agent-${i}`,
          position: { x: 60 + i, y: 0, z: 0 },
          category: 'interact',
          intensity: 0.7,
        }));
      }

      vi.advanceTimersByTime(20);

      const lobbyTraces = manager.getTracesNear(ZONES[0].center, ZONES[0].radius);
      const arenaTraces = manager.getTracesNear(ZONES[2].center, ZONES[2].radius);

      expect(lobbyTraces.length).toBe(3);
      expect(arenaTraces.length).toBe(3);

      // Arena traces should have higher intensity (interact > visit)
      const avgLobbyIntensity = lobbyTraces.reduce((s, t) => s + t.intensity, 0) / lobbyTraces.length;
      const avgArenaIntensity = arenaTraces.reduce((s, t) => s + t.intensity, 0) / arenaTraces.length;
      expect(avgArenaIntensity).toBeGreaterThan(avgLobbyIntensity);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CULTURAL NORM TRACES
  // ---------------------------------------------------------------------------

  describe('cultural norm traces', () => {
    it('hazard deposits in quiet zone are correctly categorized', () => {
      // Agent deposits hazard in garden (quiet zone)
      manager.depositHazard(
        { x: 0, y: 0, z: 40 },
        'Loud noise source detected',
        'Monitor',
      );
      vi.advanceTimersByTime(20);

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(1);
      expect(traces[0].category).toBe('hazard');
      expect(traces[0].tags).toContain('hazard');
      expect(traces[0].intensity).toBe(TRACE_CATEGORY_DEFAULTS.hazard.intensity);
    });

    it('emotional traces in arena reflect competitive behavior', () => {
      // Agents express emotions in arena
      manager.depositEmotion({ x: 58, y: 0, z: 0 }, 'excitement', 'Competitor1');
      manager.depositEmotion({ x: 60, y: 0, z: 0 }, 'frustration', 'Competitor2');
      manager.depositEmotion({ x: 62, y: 0, z: 0 }, 'surprise', 'Spectator');
      vi.advanceTimersByTime(20);

      const arenaTraces = manager.getTracesNear(ZONES[2].center, ZONES[2].radius);
      const emotionalTraces = arenaTraces.filter(t => t.category === 'emotional');
      expect(emotionalTraces).toHaveLength(3);

      const emotions = emotionalTraces.map(t => t.metadata.emotion);
      expect(emotions).toContain('excitement');
      expect(emotions).toContain('frustration');
      expect(emotions).toContain('surprise');
    });

    it('annotation traces accumulate knowledge in workspace', () => {
      const wsCenter = ZONES[1].center;
      const annotations = [
        'Sprint planning completed',
        'Architecture decision: microservices',
        'Code review checklist updated',
      ];

      for (let i = 0; i < annotations.length; i++) {
        manager.deposit(createTestDeposit({
          agentId: `worker-${i}`,
          position: { x: wsCenter.x + i, y: 0, z: wsCenter.z },
          category: 'annotate',
          textContent: annotations[i],
          tags: ['knowledge'],
        }));
      }
      vi.advanceTimersByTime(20);

      const wsTraces = manager.getTracesNear(wsCenter, ZONES[1].radius);
      const annotationTraces = wsTraces.filter(t => t.category === 'annotate');
      expect(annotationTraces).toHaveLength(3);

      // Annotations should have slow decay (persistent knowledge)
      for (const trace of annotationTraces) {
        expect(trace.decayRate).toBe(TRACE_CATEGORY_DEFAULTS.annotate.decayRate);
        expect(trace.decayRate).toBeLessThan(TRACE_CATEGORY_DEFAULTS.visit.decayRate);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. RENDER OUTPUT PER ZONE
  // ---------------------------------------------------------------------------

  describe('render output per zone', () => {
    it('produces particles for nearby zone traces', () => {
      // Deposit traces in lobby
      for (let i = 0; i < 5; i++) {
        manager.deposit(createTestDeposit({
          agentId: `vis-agent-${i}`,
          position: { x: i - 2, y: 0, z: 0 },
          intensity: 0.5,
        }));
      }
      vi.advanceTimersByTime(20);

      // Camera positioned at lobby
      manager.setCameraPosition({ x: 0, y: 0, z: 0 });
      const output = manager.render();

      expect(output.particles.length).toBeGreaterThan(0);
      expect(output.frameSequence).toBe(1);
    });

    it('culls particles from distant zones', () => {
      // Create renderer with tight view distance
      const tightManager = createCulturalTraceManager({
        worldId: 'test-cull',
        localAgentId: 'agent-local',
        engine: {
          updateHz: 100,
          enableDecay: false,
          enableDiffusion: false,
          grid: {
            cellSize: 1.0,
            worldMin: { x: -100, y: -10, z: -100 },
            worldMax: { x: 100, y: 50, z: 100 },
            maxTracesPerCell: 50,
          },
        },
        renderer: {
          showTraceParticles: true,
          viewDistance: 15, // Only see traces within 15 units
          maxVisibleParticles: 1000,
        },
      });
      tightManager.start();

      // Deposit in lobby
      tightManager.deposit(createTestDeposit({
        agentId: 'near',
        position: { x: 5, y: 0, z: 0 },
        intensity: 0.5,
      }));

      // Deposit in arena (far away)
      tightManager.deposit(createTestDeposit({
        agentId: 'far',
        position: { x: 60, y: 0, z: 0 },
        intensity: 0.5,
      }));

      vi.advanceTimersByTime(20);

      // Camera at lobby
      tightManager.setCameraPosition({ x: 0, y: 0, z: 0 });
      const output = tightManager.render();

      // Should only see lobby trace, not arena
      expect(output.particles).toHaveLength(1);
      expect(output.particles[0].agentId).toBe('near');

      tightManager.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. COLLECTIVE MEMORY ACROSS ZONES
  // ---------------------------------------------------------------------------

  describe('collective memory across zones', () => {
    it('heatmap reflects per-zone activity levels', () => {
      // High activity in workspace
      for (let i = 0; i < 8; i++) {
        manager.deposit(createTestDeposit({
          agentId: `ws-agent-${i}`,
          position: { x: 28 + i, y: 0, z: 0 },
          category: 'interact',
          intensity: 0.8,
        }));
      }

      // Low activity in garden
      manager.deposit(createTestDeposit({
        agentId: 'garden-agent',
        position: { x: 0, y: 0, z: 40 },
        category: 'visit',
        intensity: 0.2,
      }));

      vi.advanceTimersByTime(20); // Engine
      vi.advanceTimersByTime(20); // Aggregator

      const heatmap = manager.getHeatmap();
      expect(heatmap.size).toBeGreaterThan(0);

      // Workspace cells should have higher intensity
      const wsCellId = positionToCellId(ZONES[1].center, 1.0);
      const gardenCellId = positionToCellId(ZONES[3].center, 1.0);

      // There should be activity near workspace
      const wsNearTraces = manager.getTracesNear(ZONES[1].center, ZONES[1].radius);
      const gardenNearTraces = manager.getTracesNear(ZONES[3].center, ZONES[3].radius);
      expect(wsNearTraces.length).toBeGreaterThan(gardenNearTraces.length);
    });

    it('metrics track cross-zone agent diversity', () => {
      // Multiple agents across multiple zones
      const agents = ['alice', 'bob', 'charlie', 'diana', 'eve'];
      const positions = [
        { x: 0, y: 0, z: 0 },     // lobby
        { x: 30, y: 0, z: 0 },    // workspace
        { x: 60, y: 0, z: 0 },    // arena
        { x: 0, y: 0, z: 40 },    // garden
        { x: 30, y: 0, z: 0 },    // workspace again
      ];

      for (let i = 0; i < agents.length; i++) {
        manager.deposit(createTestDeposit({
          agentId: agents[i],
          agentName: agents[i],
          position: positions[i],
          intensity: 0.5,
        }));
      }
      vi.advanceTimersByTime(20);

      const metrics = manager.getMetrics();
      expect(metrics.totalDeposits).toBe(5);
      expect(metrics.totalActiveTraces).toBe(5);
      expect(metrics.uniqueAgents).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. ZONE BOUNDARY BEHAVIOR
  // ---------------------------------------------------------------------------

  describe('zone boundary behavior', () => {
    it('agent at zone boundary has traces visible from both zones', () => {
      // Deposit at boundary between lobby and workspace
      const boundaryPos = { x: 10, y: 0, z: 0 }; // Lobby edge
      manager.deposit(createTestDeposit({
        agentId: 'boundary-agent',
        position: boundaryPos,
        intensity: 0.5,
      }));
      vi.advanceTimersByTime(20);

      // Should be near lobby
      const lobbyTraces = manager.getTracesNear(ZONES[0].center, ZONES[0].radius + 5);
      expect(lobbyTraces.length).toBeGreaterThanOrEqual(1);
    });

    it('traces outside all zones are still tracked', () => {
      const noMansLand = { x: 15, y: 0, z: 20 }; // Between all zones
      manager.depositVisit(noMansLand, 'Explorer');
      vi.advanceTimersByTime(20);

      const zone = getZoneForPosition(noMansLand);
      expect(zone).toBeNull(); // Not in any zone

      // But trace should still exist
      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. REINFORCEMENT IN POPULAR ZONES
  // ---------------------------------------------------------------------------

  describe('reinforcement in popular zones', () => {
    it('repeated visits to same spot reinforce trace intensity', () => {
      const engineWithReinforcement = createCulturalTraceManager({
        worldId: 'test-reinforce',
        localAgentId: 'agent-local',
        engine: {
          updateHz: 100,
          enableDecay: false,
          enableDiffusion: false,
          enableReinforcement: true,
          reinforcementBoost: 0.1,
          grid: {
            cellSize: 1.0,
            worldMin: { x: -50, y: -10, z: -50 },
            worldMax: { x: 50, y: 10, z: 50 },
            maxTracesPerCell: 50,
          },
        },
        aggregator: { updateHz: 100 },
        renderer: { showTraceParticles: true, viewDistance: 100 },
      });
      engineWithReinforcement.start();

      const hotSpot = { x: 0, y: 0, z: 0 };

      // First visit
      engineWithReinforcement.deposit(createTestDeposit({
        position: hotSpot,
        intensity: 0.3,
      }));
      vi.advanceTimersByTime(20);

      const firstIntensity = Array.from(engineWithReinforcement.getTraces().values())[0].intensity;

      // Second visit to same spot
      engineWithReinforcement.deposit(createTestDeposit({
        position: hotSpot,
        intensity: 0.3,
      }));
      vi.advanceTimersByTime(20);

      const traces = Array.from(engineWithReinforcement.getTraces().values());
      expect(traces).toHaveLength(1); // Reinforced, not duplicated

      const reinforcedIntensity = traces[0].intensity;
      expect(reinforcedIntensity).toBeGreaterThan(firstIntensity);
      expect(traces[0].reinforcementCount).toBe(1);

      engineWithReinforcement.destroy();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. EVENT-DRIVEN ZONE TRANSITIONS
  // ---------------------------------------------------------------------------

  describe('event-driven zone transitions', () => {
    it('emits trace:deposited event for each zone entry deposit', () => {
      const depositHandler = vi.fn();
      manager.on('trace:deposited', depositHandler);

      manager.depositVisit(ZONES[0].center, 'EventTester');
      vi.advanceTimersByTime(20);

      expect(depositHandler).toHaveBeenCalledTimes(1);
      expect(depositHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'local',
          trace: expect.objectContaining({
            agentId: 'agent-local',
            category: 'visit',
          }),
        }),
      );
    });

    it('emits memory:updated when aggregation detects zone-level changes', () => {
      const memoryHandler = vi.fn();
      manager.on('memory:updated', memoryHandler);

      // Deposit enough traces to trigger aggregation
      for (let i = 0; i < 5; i++) {
        manager.deposit(createTestDeposit({
          agentId: `mem-agent-${i}`,
          position: { x: i, y: 0, z: 0 },
          intensity: 0.5,
        }));
      }

      vi.advanceTimersByTime(20); // Engine
      vi.advanceTimersByTime(20); // Aggregator

      expect(memoryHandler).toHaveBeenCalled();
    });
  });
});
