/**
 * @vitest-environment jsdom
 */

/**
 * Tests for GRPOEventEmitter
 *
 * Validates:
 * - Broadcasting events to connected clients
 * - Internal state accumulation with bounded history
 * - Snapshot hydration on client connection
 * - Client command handling
 * - Client count tracking
 * - State reset
 * - Graceful handling of disconnected/erroring clients
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GRPOEventEmitter } from '../GRPOEventEmitter';
import type { WSClient, WSServer, GRPOCommand, GRPOEventEmitterOptions } from '../GRPOEventEmitter';
import type {
  RewardDataPoint,
  RewardSignalName,
  KLDataPoint,
  CompletionGroup,
  CompletionSample,
  ForgettingMetrics,
  GPUStats,
  TrainingParams,
  TrainingProgress,
  TrainingStatus,
} from '../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

/** WebSocket OPEN readyState */
const WS_OPEN = 1;
const WS_CLOSED = 3;

function createMockClient(readyState: number = WS_OPEN): WSClient & { sentMessages: string[] } {
  const sentMessages: string[] = [];
  return {
    readyState,
    send: vi.fn((data: string) => {
      sentMessages.push(data);
    }),
    sentMessages,
  };
}

function createMockWSServer(): WSServer & {
  clients: Set<WSClient>;
  connectionListeners: Array<(ws: WSClient) => void>;
  triggerConnection: (ws: WSClient) => void;
} {
  const connectionListeners: Array<(ws: WSClient) => void> = [];
  const clients = new Set<WSClient>();

  return {
    clients,
    connectionListeners,
    on(event: string, listener: (ws: WSClient) => void) {
      if (event === 'connection') {
        connectionListeners.push(listener);
      }
    },
    triggerConnection(ws: WSClient) {
      clients.add(ws);
      for (const listener of connectionListeners) {
        listener(ws);
      }
    },
  };
}

function createTestRewardPoint(step: number): RewardDataPoint {
  return {
    step,
    rewards: {
      testPassReward: 0.65,
      typeCheckReward: 0.72,
      lintReward: 0.80,
      coverageReward: 0.55,
      circuitBreakerReward: 0.90,
      composite: 0.70,
    },
  };
}

function createTestKLPoint(step: number): KLDataPoint {
  return { step, kl: 0.025, beta: 0.04 };
}

function createTestCompletionGroup(step: number): CompletionGroup {
  const makeSample = (id: string, score: number): CompletionSample => ({
    id,
    step,
    prompt: 'function add(a: number, b: number): number {',
    completion: '  return a + b;\n}',
    totalScore: score,
    rewardBreakdown: {
      testPassReward: score * 0.4,
      typeCheckReward: score * 0.2,
      lintReward: score * 0.15,
      coverageReward: score * 0.15,
      circuitBreakerReward: score * 0.1,
      composite: score,
    },
  });

  return {
    step,
    prompt: 'function add(a: number, b: number): number {',
    best: makeSample('best-1', 0.92),
    worst: makeSample('worst-1', 0.25),
  };
}

function createTestForgettingMetrics(): ForgettingMetrics {
  return {
    oplora: { constraintValue: 0.015, constraintThreshold: 0.05 },
    benchmarks: [{ step: 500, humanEval: 0.68, mbpp: 0.55 }],
    humanEvalBaseline: 0.68,
    mbppBaseline: 0.55,
    forgettingAlert: false,
  };
}

function createTestGPUStats(): GPUStats {
  return {
    gpuUtilization: 87,
    memoryUsedGB: 18.5,
    memoryTotalGB: 24,
    temperatureCelsius: 72,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('GRPOEventEmitter', () => {
  let wss: ReturnType<typeof createMockWSServer>;
  let emitter: GRPOEventEmitter;

  beforeEach(() => {
    wss = createMockWSServer();
    emitter = new GRPOEventEmitter(wss);
  });

  // ---------------------------------------------------
  // BROADCASTING
  // ---------------------------------------------------

  describe('broadcasting events', () => {
    it('broadcasts reward events to all connected clients', () => {
      const client1 = createMockClient();
      const client2 = createMockClient();
      wss.triggerConnection(client1);
      wss.triggerConnection(client2);

      // Clear snapshot messages sent on connection
      client1.sentMessages.length = 0;
      client2.sentMessages.length = 0;

      const point = createTestRewardPoint(100);
      emitter.emitReward(point);

      expect(client1.sentMessages).toHaveLength(1);
      expect(client2.sentMessages).toHaveLength(1);

      const parsed = JSON.parse(client1.sentMessages[0]);
      expect(parsed.type).toBe('reward');
      expect(parsed.point.step).toBe(100);
      expect(parsed.point.rewards.testPassReward).toBe(0.65);
    });

    it('broadcasts KL events to all connected clients', () => {
      const client = createMockClient();
      wss.triggerConnection(client);
      client.sentMessages.length = 0;

      const point = createTestKLPoint(200);
      emitter.emitKL(point);

      const parsed = JSON.parse(client.sentMessages[0]);
      expect(parsed.type).toBe('kl');
      expect(parsed.point.step).toBe(200);
      expect(parsed.point.kl).toBe(0.025);
    });

    it('broadcasts completion events', () => {
      const client = createMockClient();
      wss.triggerConnection(client);
      client.sentMessages.length = 0;

      const group = createTestCompletionGroup(300);
      emitter.emitCompletion(group);

      const parsed = JSON.parse(client.sentMessages[0]);
      expect(parsed.type).toBe('completion');
      expect(parsed.group.step).toBe(300);
      expect(parsed.group.best.totalScore).toBe(0.92);
    });

    it('broadcasts forgetting metrics', () => {
      const client = createMockClient();
      wss.triggerConnection(client);
      client.sentMessages.length = 0;

      const metrics = createTestForgettingMetrics();
      emitter.emitForgetting(metrics);

      const parsed = JSON.parse(client.sentMessages[0]);
      expect(parsed.type).toBe('forgetting');
      expect(parsed.metrics.oplora.constraintValue).toBe(0.015);
    });

    it('broadcasts status events', () => {
      const client = createMockClient();
      wss.triggerConnection(client);
      client.sentMessages.length = 0;

      emitter.emitStatus('running');

      const parsed = JSON.parse(client.sentMessages[0]);
      expect(parsed.type).toBe('status');
      expect(parsed.status).toBe('running');
    });

    it('broadcasts param events', () => {
      const client = createMockClient();
      wss.triggerConnection(client);
      client.sentMessages.length = 0;

      emitter.emitParams({ temperature: 0.8, beta: 0.05 });

      const parsed = JSON.parse(client.sentMessages[0]);
      expect(parsed.type).toBe('params');
      expect(parsed.params.temperature).toBe(0.8);
    });

    it('broadcasts progress events', () => {
      const client = createMockClient();
      wss.triggerConnection(client);
      client.sentMessages.length = 0;

      emitter.emitProgress({
        currentStep: 5000,
        totalSteps: 20000,
        elapsedSeconds: 3600,
        estimatedRemainingSeconds: 10800,
      });

      const parsed = JSON.parse(client.sentMessages[0]);
      expect(parsed.type).toBe('progress');
      expect(parsed.progress.currentStep).toBe(5000);
    });

    it('broadcasts GPU stats', () => {
      const client = createMockClient();
      wss.triggerConnection(client);
      client.sentMessages.length = 0;

      emitter.emitGPU(createTestGPUStats());

      const parsed = JSON.parse(client.sentMessages[0]);
      expect(parsed.type).toBe('gpu');
      expect(parsed.stats.gpuUtilization).toBe(87);
    });

    it('skips closed clients during broadcast', () => {
      const openClient = createMockClient(WS_OPEN);
      const closedClient = createMockClient(WS_CLOSED);
      wss.triggerConnection(openClient);
      wss.triggerConnection(closedClient);

      openClient.sentMessages.length = 0;
      closedClient.sentMessages.length = 0;

      emitter.emitReward(createTestRewardPoint(100));

      expect(openClient.sentMessages).toHaveLength(1);
      expect(closedClient.sentMessages).toHaveLength(0);
    });

    it('gracefully handles send errors', () => {
      const errorClient = createMockClient(WS_OPEN);
      (errorClient as any).send = vi.fn(() => { throw new Error('connection lost'); });
      wss.triggerConnection(errorClient);

      // Should not throw
      expect(() => emitter.emitReward(createTestRewardPoint(100))).not.toThrow();
    });
  });

  // ---------------------------------------------------
  // INTERNAL STATE
  // ---------------------------------------------------

  describe('internal state management', () => {
    it('accumulates reward history', () => {
      emitter.emitReward(createTestRewardPoint(100));
      emitter.emitReward(createTestRewardPoint(200));
      emitter.emitReward(createTestRewardPoint(300));

      const state = emitter.getState();
      expect(state.rewardHistory).toHaveLength(3);
      expect(state.rewardHistory[0].step).toBe(100);
      expect(state.rewardHistory[2].step).toBe(300);
    });

    it('bounds reward history to maxRewardHistory', () => {
      const smallEmitter = new GRPOEventEmitter(wss, { maxRewardHistory: 3 });

      for (let i = 1; i <= 5; i++) {
        smallEmitter.emitReward(createTestRewardPoint(i * 100));
      }

      const state = smallEmitter.getState();
      expect(state.rewardHistory).toHaveLength(3);
      expect(state.rewardHistory[0].step).toBe(300);
      expect(state.rewardHistory[2].step).toBe(500);
    });

    it('bounds KL history to maxKLHistory', () => {
      const smallEmitter = new GRPOEventEmitter(wss, { maxKLHistory: 2 });

      for (let i = 1; i <= 4; i++) {
        smallEmitter.emitKL(createTestKLPoint(i * 100));
      }

      const state = smallEmitter.getState();
      expect(state.klHistory).toHaveLength(2);
      expect(state.klHistory[0].step).toBe(300);
    });

    it('bounds completion groups to maxCompletionGroups', () => {
      const smallEmitter = new GRPOEventEmitter(wss, { maxCompletionGroups: 2 });

      for (let i = 1; i <= 4; i++) {
        smallEmitter.emitCompletion(createTestCompletionGroup(i * 100));
      }

      const state = smallEmitter.getState();
      expect(state.completionGroups).toHaveLength(2);
      expect(state.completionGroups[0].step).toBe(300);
    });

    it('stores latest training status', () => {
      emitter.emitStatus('running');
      expect(emitter.getState().trainingStatus).toBe('running');

      emitter.emitStatus('paused');
      expect(emitter.getState().trainingStatus).toBe('paused');
    });

    it('stores latest params', () => {
      emitter.emitParams({ temperature: 1.2, beta: 0.06 });
      const state = emitter.getState();
      expect(state.trainingParams.temperature).toBe(1.2);
      expect(state.trainingParams.beta).toBe(0.06);
    });

    it('stores latest progress', () => {
      emitter.emitProgress({
        currentStep: 7500,
        totalSteps: 20000,
        elapsedSeconds: 5400,
        estimatedRemainingSeconds: 9000,
      });
      expect(emitter.getState().progress.currentStep).toBe(7500);
    });

    it('stores latest GPU stats', () => {
      emitter.emitGPU(createTestGPUStats());
      expect(emitter.getState().gpuStats).not.toBeNull();
      expect(emitter.getState().gpuStats!.gpuUtilization).toBe(87);
    });

    it('stores latest forgetting metrics', () => {
      emitter.emitForgetting(createTestForgettingMetrics());
      expect(emitter.getState().forgettingMetrics).not.toBeNull();
    });

    it('returns copies from getState (immutability)', () => {
      emitter.emitReward(createTestRewardPoint(100));
      const state1 = emitter.getState();
      const state2 = emitter.getState();
      expect(state1.rewardHistory).not.toBe(state2.rewardHistory);
      expect(state1.rewardHistory).toEqual(state2.rewardHistory);
    });
  });

  // ---------------------------------------------------
  // SNAPSHOT
  // ---------------------------------------------------

  describe('snapshot hydration', () => {
    it('sends snapshot to newly connected clients', () => {
      // Populate some state
      emitter.emitReward(createTestRewardPoint(100));
      emitter.emitKL(createTestKLPoint(100));
      emitter.emitStatus('running');

      const client = createMockClient();
      wss.triggerConnection(client);

      expect(client.sentMessages).toHaveLength(1);
      const snapshot = JSON.parse(client.sentMessages[0]);
      expect(snapshot.type).toBe('snapshot');
      expect(snapshot.rewardHistory).toHaveLength(1);
      expect(snapshot.klHistory).toHaveLength(1);
      expect(snapshot.trainingStatus).toBe('running');
      expect(snapshot.connected).toBe(true);
    });

    it('broadcastSnapshot sends to all open clients', () => {
      const client1 = createMockClient();
      const client2 = createMockClient();
      wss.triggerConnection(client1);
      wss.triggerConnection(client2);

      client1.sentMessages.length = 0;
      client2.sentMessages.length = 0;

      emitter.broadcastSnapshot();

      expect(client1.sentMessages).toHaveLength(1);
      expect(client2.sentMessages).toHaveLength(1);

      const snap1 = JSON.parse(client1.sentMessages[0]);
      expect(snap1.type).toBe('snapshot');
    });
  });

  // ---------------------------------------------------
  // CLIENT COUNT
  // ---------------------------------------------------

  describe('client count', () => {
    it('counts open clients', () => {
      expect(emitter.clientCount).toBe(0);

      const client1 = createMockClient(WS_OPEN);
      const client2 = createMockClient(WS_OPEN);
      const client3 = createMockClient(WS_CLOSED);
      wss.triggerConnection(client1);
      wss.triggerConnection(client2);
      wss.triggerConnection(client3);

      expect(emitter.clientCount).toBe(2);
    });
  });

  // ---------------------------------------------------
  // RESET
  // ---------------------------------------------------

  describe('reset', () => {
    it('clears all internal state', () => {
      emitter.emitReward(createTestRewardPoint(100));
      emitter.emitKL(createTestKLPoint(100));
      emitter.emitCompletion(createTestCompletionGroup(100));
      emitter.emitForgetting(createTestForgettingMetrics());
      emitter.emitStatus('running');
      emitter.emitGPU(createTestGPUStats());

      emitter.reset();

      const state = emitter.getState();
      expect(state.rewardHistory).toHaveLength(0);
      expect(state.klHistory).toHaveLength(0);
      expect(state.completionGroups).toHaveLength(0);
      expect(state.forgettingMetrics).toBeNull();
      expect(state.trainingStatus).toBe('paused');
      expect(state.gpuStats).toBeNull();
    });
  });

  // ---------------------------------------------------
  // COMMAND HANDLING
  // ---------------------------------------------------

  describe('command handling', () => {
    it('invokes onCommand callback when client sends a command', () => {
      const onCommand = vi.fn();
      const cmdEmitter = new GRPOEventEmitter(wss, { onCommand });

      // Create a client with .on method (like ws package)
      const messageListeners: Array<(data: unknown) => void> = [];
      const client: WSClient & { on: (event: string, listener: (data: unknown) => void) => void } = {
        readyState: WS_OPEN,
        send: vi.fn(),
        on(event: string, listener: (data: unknown) => void) {
          if (event === 'message') {
            messageListeners.push(listener);
          }
        },
      };

      wss.triggerConnection(client);

      // Simulate client sending a pause command
      for (const listener of messageListeners) {
        listener(JSON.stringify({ command: 'pause' }));
      }

      expect(onCommand).toHaveBeenCalledTimes(1);
      expect(onCommand).toHaveBeenCalledWith(
        { command: 'pause' },
        client,
      );
    });

    it('ignores malformed command messages', () => {
      const onCommand = vi.fn();
      const cmdEmitter = new GRPOEventEmitter(wss, { onCommand });

      const messageListeners: Array<(data: unknown) => void> = [];
      const client: WSClient & { on: (event: string, listener: (data: unknown) => void) => void } = {
        readyState: WS_OPEN,
        send: vi.fn(),
        on(event: string, listener: (data: unknown) => void) {
          if (event === 'message') {
            messageListeners.push(listener);
          }
        },
      };

      wss.triggerConnection(client);

      // Send invalid JSON
      for (const listener of messageListeners) {
        listener('not json');
      }

      // Send valid JSON without command field
      for (const listener of messageListeners) {
        listener(JSON.stringify({ notACommand: true }));
      }

      expect(onCommand).not.toHaveBeenCalled();
    });
  });
});
