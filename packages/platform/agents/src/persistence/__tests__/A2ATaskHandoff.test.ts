/**
 * Tests for A2ATaskHandoff - Agent-to-Agent Task Delegation Protocol
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  A2ATaskHandoff,
  getA2ATaskHandoff,
  resetA2ATaskHandoff,
} from '../A2ATaskHandoff.js';

describe('A2ATaskHandoff', () => {
  let handoff: A2ATaskHandoff;

  beforeEach(() => {
    handoff = new A2ATaskHandoff({ autoTimeout: false });
  });

  afterEach(() => {
    handoff.destroy();
  });

  // =========================================================================
  // Task Proposal
  // =========================================================================

  describe('propose', () => {
    it('creates a task in proposed state', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Analyze metrics',
        description: 'Run sentiment analysis on conversations',
        priority: 'high',
        sceneId: 'analytics-room',
        context: { timeRange: '7d' },
        requiredCapabilities: ['data-analysis'],
      });

      expect(task.id).toBeDefined();
      expect(task.state).toBe('proposed');
      expect(task.priority).toBe('high');
      expect(task.senderDID).toBe('did:holo:manager');
      expect(task.receiverDID).toBe('did:holo:analyst');
      expect(task.title).toBe('Analyze metrics');
      expect(task.context.timeRange).toBe('7d');
      expect(task.requiredCapabilities).toContain('data-analysis');
    });

    it('defaults priority to medium', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test task',
        sceneId: 'world-1',
      });

      expect(task.priority).toBe('medium');
    });

    it('records initial state history', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      expect(task.stateHistory).toHaveLength(1);
      expect(task.stateHistory[0].to).toBe('proposed');
      expect(task.stateHistory[0].triggeredBy).toBe('did:holo:manager');
    });

    it('emits proposed event', () => {
      const callback = vi.fn();
      const h = new A2ATaskHandoff({ autoTimeout: false, onTaskEvent: callback });

      h.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'proposed' }),
      );

      h.destroy();
    });
  });

  // =========================================================================
  // Task Lifecycle
  // =========================================================================

  describe('accept', () => {
    it('transitions task to accepted state', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      const accepted = handoff.accept(task.id, 'analyst');

      expect(accepted).not.toBeNull();
      expect(accepted!.state).toBe('accepted');
      expect(accepted!.stateHistory).toHaveLength(2);
    });

    it('returns null for non-existent task', () => {
      expect(handoff.accept('nonexistent', 'analyst')).toBeNull();
    });
  });

  describe('reject', () => {
    it('transitions task to rejected state', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      const rejected = handoff.reject(task.id, 'analyst', 'Too busy');

      expect(rejected).not.toBeNull();
      expect(rejected!.state).toBe('rejected');
      expect(rejected!.rejectionReason).toBe('Too busy');
    });
  });

  describe('startProgress', () => {
    it('transitions accepted task to in_progress', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      handoff.accept(task.id, 'analyst');
      const started = handoff.startProgress(task.id, 'analyst');

      expect(started).not.toBeNull();
      expect(started!.state).toBe('in_progress');
    });

    it('cannot start progress on proposed task', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      const started = handoff.startProgress(task.id, 'analyst');
      expect(started).toBeNull(); // Invalid transition
    });
  });

  describe('complete', () => {
    it('completes a task with results', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Analyze data',
        description: 'Test',
        sceneId: 'world-1',
      });

      handoff.accept(task.id, 'analyst');
      handoff.startProgress(task.id, 'analyst');

      const completed = handoff.complete(task.id, 'analyst', {
        success: true,
        data: { avgSentiment: 0.73 },
        summary: 'Analysis complete. Avg sentiment 0.73.',
        artifacts: ['/reports/sentiment.pdf'],
      });

      expect(completed).not.toBeNull();
      expect(completed!.state).toBe('completed');
      expect(completed!.result).toBeDefined();
      expect(completed!.result!.success).toBe(true);
      expect(completed!.result!.data.avgSentiment).toBe(0.73);
      expect(completed!.result!.durationMs).toBeGreaterThanOrEqual(0);
      expect(completed!.result!.completedAt).toBeDefined();
    });
  });

  describe('fail', () => {
    it('marks task as failed with reason', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      handoff.accept(task.id, 'analyst');
      handoff.startProgress(task.id, 'analyst');

      const failed = handoff.fail(task.id, 'analyst', 'Data source unavailable');

      expect(failed).not.toBeNull();
      expect(failed!.state).toBe('failed');
      expect(failed!.failureReason).toBe('Data source unavailable');
    });
  });

  describe('cancel', () => {
    it('cancels a proposed task', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      const cancelled = handoff.cancel(task.id, 'manager', 'No longer needed');

      expect(cancelled).not.toBeNull();
      expect(cancelled!.state).toBe('cancelled');
      expect(cancelled!.cancellationReason).toBe('No longer needed');
    });

    it('cancels an in-progress task', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      handoff.accept(task.id, 'analyst');
      handoff.startProgress(task.id, 'analyst');

      const cancelled = handoff.cancel(task.id, 'manager', 'Priorities changed');
      expect(cancelled).not.toBeNull();
      expect(cancelled!.state).toBe('cancelled');
    });
  });

  describe('acknowledge', () => {
    it('acknowledges completed task results', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      handoff.accept(task.id, 'analyst');
      handoff.startProgress(task.id, 'analyst');
      handoff.complete(task.id, 'analyst', {
        success: true,
        data: {},
        summary: 'Done',
        artifacts: [],
      });

      const acked = handoff.acknowledge(task.id, 'manager');

      expect(acked).not.toBeNull();
      expect(acked!.state).toBe('acknowledged');
    });
  });

  // =========================================================================
  // State Transition Validation
  // =========================================================================

  describe('state transition validation', () => {
    it('rejects invalid transitions', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      // Cannot go directly from proposed to completed
      const result = handoff.complete(task.id, 'analyst', {
        success: true,
        data: {},
        summary: 'Done',
        artifacts: [],
      });
      expect(result).toBeNull();
    });

    it('rejected tasks cannot be accepted', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      handoff.reject(task.id, 'analyst', 'No');
      const accepted = handoff.accept(task.id, 'analyst');
      expect(accepted).toBeNull();
    });

    it('acknowledged tasks are terminal', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      handoff.accept(task.id, 'analyst');
      handoff.startProgress(task.id, 'analyst');
      handoff.complete(task.id, 'analyst', {
        success: true, data: {}, summary: 'Done', artifacts: [],
      });
      handoff.acknowledge(task.id, 'manager');

      // Cannot transition from acknowledged
      const result = handoff.cancel(task.id, 'manager', 'Try cancel');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // Full Lifecycle
  // =========================================================================

  describe('full lifecycle', () => {
    it('completes a full task lifecycle', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Full lifecycle test',
        description: 'Test all states',
        priority: 'high',
        sceneId: 'world-1',
        context: { test: true },
      });

      expect(task.state).toBe('proposed');

      handoff.accept(task.id, 'analyst');
      expect(handoff.getTask(task.id)!.state).toBe('accepted');

      handoff.startProgress(task.id, 'analyst');
      expect(handoff.getTask(task.id)!.state).toBe('in_progress');

      handoff.complete(task.id, 'analyst', {
        success: true,
        data: { result: 42 },
        summary: 'The answer is 42',
        artifacts: [],
      });
      expect(handoff.getTask(task.id)!.state).toBe('completed');

      handoff.acknowledge(task.id, 'manager');
      expect(handoff.getTask(task.id)!.state).toBe('acknowledged');

      // Verify full state history
      expect(task.stateHistory).toHaveLength(5);
    });
  });

  // =========================================================================
  // Subtask Decomposition
  // =========================================================================

  describe('subtask decomposition', () => {
    it('decomposes a task into subtasks', () => {
      const parent = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Big analysis',
        description: 'Analyze everything',
        sceneId: 'world-1',
      });

      const subtasks = handoff.decompose(
        parent.id,
        [
          {
            receiverAgentId: 'analyst-1',
            title: 'Subtask 1',
            description: 'First part',
          },
          {
            receiverAgentId: 'analyst-2',
            title: 'Subtask 2',
            description: 'Second part',
          },
        ],
        'manager',
        'world-1',
      );

      expect(subtasks).toHaveLength(2);
      expect(subtasks[0].parentTaskId).toBe(parent.id);
      expect(subtasks[1].parentTaskId).toBe(parent.id);
      expect(parent.childTaskIds).toHaveLength(2);
    });

    it('checks subtask completion', () => {
      const parent = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'lead',
        title: 'Parent',
        description: 'Parent task',
        sceneId: 'world-1',
      });

      const subtasks = handoff.decompose(
        parent.id,
        [
          { receiverAgentId: 'worker-1', title: 'Sub 1', description: 'First' },
          { receiverAgentId: 'worker-2', title: 'Sub 2', description: 'Second' },
        ],
        'lead',
        'world-1',
      );

      expect(handoff.areSubtasksComplete(parent.id)).toBe(false);

      // Complete first subtask
      handoff.accept(subtasks[0].id, 'worker-1');
      handoff.startProgress(subtasks[0].id, 'worker-1');
      handoff.complete(subtasks[0].id, 'worker-1', {
        success: true, data: {}, summary: 'Done 1', artifacts: [],
      });

      expect(handoff.areSubtasksComplete(parent.id)).toBe(false);

      // Complete second subtask
      handoff.accept(subtasks[1].id, 'worker-2');
      handoff.startProgress(subtasks[1].id, 'worker-2');
      handoff.complete(subtasks[1].id, 'worker-2', {
        success: true, data: {}, summary: 'Done 2', artifacts: [],
      });

      expect(handoff.areSubtasksComplete(parent.id)).toBe(true);
    });

    it('gets subtask results', () => {
      const parent = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'lead',
        title: 'Parent',
        description: 'Parent',
        sceneId: 'world-1',
      });

      handoff.decompose(
        parent.id,
        [{ receiverAgentId: 'worker', title: 'Sub', description: 'Sub' }],
        'lead',
        'world-1',
      );

      const results = handoff.getSubtaskResults(parent.id);
      expect(results).toHaveLength(1);
    });
  });

  // =========================================================================
  // Query
  // =========================================================================

  describe('query', () => {
    beforeEach(() => {
      handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Task 1',
        description: 'High priority',
        priority: 'high',
        sceneId: 'world-1',
        tags: ['analytics'],
      });

      const task2 = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'builder',
        title: 'Task 2',
        description: 'Low priority',
        priority: 'low',
        sceneId: 'world-2',
        tags: ['development'],
      });

      handoff.accept(task2.id, 'builder');
      handoff.startProgress(task2.id, 'builder');
    });

    it('queries by state', () => {
      const proposed = handoff.query({ states: ['proposed'] });
      expect(proposed).toHaveLength(1);

      const inProgress = handoff.query({ states: ['in_progress'] });
      expect(inProgress).toHaveLength(1);
    });

    it('queries by priority', () => {
      const high = handoff.query({ priorities: ['high'] });
      expect(high).toHaveLength(1);
    });

    it('queries by scene', () => {
      const world1 = handoff.query({ sceneId: 'world-1' });
      expect(world1).toHaveLength(1);
    });

    it('queries by tags', () => {
      const analytics = handoff.query({ tags: ['analytics'] });
      expect(analytics).toHaveLength(1);
    });

    it('applies limit', () => {
      const limited = handoff.query({ limit: 1 });
      expect(limited).toHaveLength(1);
    });

    it('sorts by priority', () => {
      const sorted = handoff.query({ sortBy: 'priority', sortDirection: 'asc' });
      expect(sorted[0].priority).toBe('high');
    });

    it('gets tasks sent by agent', () => {
      const sent = handoff.getTasksSentBy('manager');
      expect(sent).toHaveLength(2);
    });

    it('gets tasks received by agent', () => {
      const received = handoff.getTasksReceivedBy('analyst');
      expect(received).toHaveLength(1);
    });

    it('gets pending tasks', () => {
      const pending = handoff.getPendingTasks('analyst');
      expect(pending).toHaveLength(1);
    });

    it('gets active tasks', () => {
      const active = handoff.getActiveTasks('builder');
      expect(active).toHaveLength(1);
    });
  });

  // =========================================================================
  // Scene Integration
  // =========================================================================

  describe('scene integration', () => {
    it('updates active scene for in-progress tasks', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      handoff.accept(task.id, 'analyst');
      handoff.startProgress(task.id, 'analyst');

      const updated = handoff.updateActiveScene('analyst', 'world-2');

      expect(updated).toBe(1);
      expect(handoff.getTask(task.id)!.activeSceneId).toBe('world-2');
    });

    it('does not update completed tasks', () => {
      const task = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Test',
        description: 'Test',
        sceneId: 'world-1',
      });

      handoff.accept(task.id, 'analyst');
      handoff.startProgress(task.id, 'analyst');
      handoff.complete(task.id, 'analyst', {
        success: true, data: {}, summary: 'Done', artifacts: [],
      });

      const updated = handoff.updateActiveScene('analyst', 'world-2');
      expect(updated).toBe(0);
    });
  });

  // =========================================================================
  // Metrics
  // =========================================================================

  describe('metrics', () => {
    it('tracks task metrics', () => {
      handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'analyst',
        title: 'Task 1',
        description: 'Test',
        priority: 'high',
        sceneId: 'world-1',
      });

      const task2 = handoff.propose({
        senderAgentId: 'manager',
        receiverAgentId: 'builder',
        title: 'Task 2',
        description: 'Test',
        priority: 'low',
        sceneId: 'world-1',
      });

      handoff.accept(task2.id, 'builder');
      handoff.startProgress(task2.id, 'builder');
      handoff.complete(task2.id, 'builder', {
        success: true, data: {}, summary: 'Done', artifacts: [],
      });

      const metrics = handoff.getMetrics();

      expect(metrics.totalTasks).toBe(2);
      expect(metrics.byState.proposed).toBe(1);
      expect(metrics.byState.completed).toBe(1);
      expect(metrics.byPriority.high).toBe(1);
      expect(metrics.byPriority.low).toBe(1);
      expect(metrics.successRate).toBe(1);
      expect(metrics.uniqueSenders).toBe(1);
      expect(metrics.uniqueReceivers).toBe(2);
    });

    it('reports size', () => {
      handoff.propose({
        senderAgentId: 'a', receiverAgentId: 'b',
        title: 'T', description: 'T', sceneId: 'w',
      });
      expect(handoff.size).toBe(1);
    });
  });

  // =========================================================================
  // Lifecycle
  // =========================================================================

  describe('lifecycle', () => {
    it('destroys all state', () => {
      handoff.propose({
        senderAgentId: 'a', receiverAgentId: 'b',
        title: 'T', description: 'T', sceneId: 'w',
      });

      handoff.destroy();

      expect(handoff.size).toBe(0);
      expect(handoff.getTasksSentBy('a')).toHaveLength(0);
    });
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    beforeEach(() => {
      resetA2ATaskHandoff();
    });

    afterEach(() => {
      resetA2ATaskHandoff();
    });

    it('returns the same instance', () => {
      const a = getA2ATaskHandoff({ autoTimeout: false });
      const b = getA2ATaskHandoff();
      expect(a).toBe(b);
    });

    it('resets correctly', () => {
      const a = getA2ATaskHandoff({ autoTimeout: false });
      a.propose({
        senderAgentId: 'x', receiverAgentId: 'y',
        title: 'T', description: 'T', sceneId: 'w',
      });
      resetA2ATaskHandoff();

      const b = getA2ATaskHandoff({ autoTimeout: false });
      expect(b.size).toBe(0);
    });
  });
});
