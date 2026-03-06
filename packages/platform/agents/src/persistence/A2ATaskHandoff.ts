/**
 * @hololand/agents -- A2A (Agent-to-Agent) Task Handoff Protocol
 *
 * Implements a structured task handoff protocol for cross-scene agent
 * collaboration. When an agent in Scene A needs to delegate work to
 * an agent in Scene B (or within the same scene), this protocol
 * ensures the task, context, and results are tracked reliably.
 *
 * PROTOCOL:
 *   1. PROPOSE: Sending agent creates a task proposal with context
 *   2. ACCEPT/REJECT: Receiving agent evaluates and accepts/rejects
 *   3. IN_PROGRESS: Accepted tasks are worked on by the receiver
 *   4. COMPLETE/FAIL: Receiver reports results or failure
 *   5. ACKNOWLEDGE: Sender acknowledges receipt of results
 *
 * CROSS-SCENE:
 *   Tasks survive scene transitions. If an agent moves between scenes,
 *   pending tasks follow via the AgentStateWAL. Task state is replayed
 *   on scene entry to reconstruct in-flight handoffs.
 *
 * INTEGRATION:
 *   - Uses AgentDID for agent identification
 *   - Uses AgentStateWAL for persistence across scenes
 *   - Uses AgentMemoryWPG for storing learned patterns from handoffs
 *   - Integrates with ZeroTrustAgentComm for permission validation
 *
 * @version 1.0.0
 */

import { createDID } from './AgentDID.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Task lifecycle states
 */
export type TaskState =
  | 'proposed'       // Task created, awaiting acceptance
  | 'accepted'       // Task accepted by receiver
  | 'rejected'       // Task rejected by receiver
  | 'in_progress'    // Task is being worked on
  | 'completed'      // Task completed successfully
  | 'failed'         // Task failed
  | 'cancelled'      // Task cancelled by sender
  | 'acknowledged';  // Sender acknowledged results

/**
 * Task priority levels
 */
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * A task handoff between two agents
 */
export interface A2ATask {
  /** Unique task ID */
  id: string;
  /** Human-readable task title */
  title: string;
  /** Detailed task description */
  description: string;
  /** Current task state */
  state: TaskState;
  /** Task priority */
  priority: TaskPriority;

  /** Sender agent DID */
  senderDID: string;
  /** Receiver agent DID */
  receiverDID: string;

  /** Scene where task was created */
  originSceneId: string;
  /** Scene where task is currently active */
  activeSceneId: string;

  /** Context passed from sender to receiver */
  context: Record<string, unknown>;
  /** Required capabilities the receiver needs */
  requiredCapabilities: string[];

  /** Task result (populated on completion) */
  result?: TaskResult;

  /** Rejection reason (populated on rejection) */
  rejectionReason?: string;
  /** Failure reason (populated on failure) */
  failureReason?: string;
  /** Cancellation reason (populated on cancellation) */
  cancellationReason?: string;

  /** State transition history */
  stateHistory: TaskStateTransition[];

  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Optional deadline (ISO timestamp) */
  deadline?: string;
  /** Optional timeout in milliseconds */
  timeoutMs?: number;

  /** Optional parent task ID (for subtask decomposition) */
  parentTaskId?: string;
  /** Child task IDs */
  childTaskIds: string[];

  /** Tags for categorization */
  tags: string[];
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

/**
 * Task result payload
 */
export interface TaskResult {
  /** Whether the task succeeded */
  success: boolean;
  /** Result data */
  data: Record<string, unknown>;
  /** Human-readable summary */
  summary: string;
  /** Any artifacts produced (file paths, URLs, etc.) */
  artifacts: string[];
  /** Time taken in milliseconds */
  durationMs: number;
  /** Completion timestamp */
  completedAt: string;
}

/**
 * State transition record
 */
export interface TaskStateTransition {
  /** Previous state */
  from: TaskState;
  /** New state */
  to: TaskState;
  /** Agent DID that triggered the transition */
  triggeredBy: string;
  /** ISO timestamp */
  timestamp: string;
  /** Optional reason/note */
  reason?: string;
  /** Scene ID where transition occurred */
  sceneId: string;
}

/**
 * Task handoff event (for pub/sub)
 */
export interface TaskHandoffEvent {
  /** Event type */
  type: 'proposed' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'acknowledged' | 'timeout';
  /** The task */
  task: A2ATask;
  /** ISO timestamp */
  timestamp: string;
}

/**
 * Task query filters
 */
export interface TaskQuery {
  /** Filter by sender DID */
  senderDID?: string;
  /** Filter by receiver DID */
  receiverDID?: string;
  /** Filter by state(s) */
  states?: TaskState[];
  /** Filter by priority(ies) */
  priorities?: TaskPriority[];
  /** Filter by scene ID */
  sceneId?: string;
  /** Filter by tags */
  tags?: string[];
  /** Filter by parent task */
  parentTaskId?: string;
  /** Maximum results */
  limit?: number;
  /** Sort by (default: createdAt desc) */
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Task handoff configuration
 */
export interface A2ATaskHandoffConfig {
  /** Default timeout for tasks in ms (default: 300000 = 5 min) */
  defaultTimeoutMs?: number;
  /** Maximum concurrent tasks per agent (default: 50) */
  maxTasksPerAgent?: number;
  /** Maximum total tasks (default: 10000) */
  maxTotalTasks?: number;
  /** Whether to auto-timeout expired tasks (default: true) */
  autoTimeout?: boolean;
  /** Check interval for timeouts in ms (default: 10000) */
  timeoutCheckIntervalMs?: number;
  /** Callback for task events */
  onTaskEvent?: (event: TaskHandoffEvent) => void;
}

/**
 * Task handoff metrics
 */
export interface A2ATaskHandoffMetrics {
  /** Total tasks created */
  totalTasks: number;
  /** Tasks by state */
  byState: Record<TaskState, number>;
  /** Tasks by priority */
  byPriority: Record<TaskPriority, number>;
  /** Average completion time in ms */
  avgCompletionTimeMs: number;
  /** Task success rate (0-1) */
  successRate: number;
  /** Tasks currently in progress */
  inProgressTasks: number;
  /** Overdue tasks (past deadline) */
  overdueTasks: number;
  /** Number of unique sending agents */
  uniqueSenders: number;
  /** Number of unique receiving agents */
  uniqueReceivers: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Task ID counter */
let taskIdCounter = 0;

/** Priority sort order */
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// =============================================================================
// A2A TASK HANDOFF MANAGER
// =============================================================================

/**
 * Agent-to-Agent Task Handoff Manager.
 *
 * Usage:
 * ```typescript
 * const handoff = new A2ATaskHandoff();
 *
 * // Agent A proposes a task to Agent B
 * const task = handoff.propose({
 *   senderAgentId: 'manager',
 *   receiverAgentId: 'analyst',
 *   title: 'Analyze user engagement metrics',
 *   description: 'Run sentiment analysis on last 100 conversations',
 *   priority: 'high',
 *   sceneId: 'analytics-room',
 *   context: { timeRange: '7d', metrics: ['sentiment', 'satisfaction'] },
 *   requiredCapabilities: ['data-analysis', 'sentiment-analysis'],
 * });
 *
 * // Agent B accepts and starts working
 * handoff.accept(task.id, 'analyst');
 * handoff.startProgress(task.id, 'analyst');
 *
 * // Agent B transitions to a new scene - task persists
 * // Agent B completes the task
 * handoff.complete(task.id, 'analyst', {
 *   success: true,
 *   data: { avgSentiment: 0.73, topIssues: ['latency', 'ui'] },
 *   summary: 'Analysis complete. Avg sentiment 0.73. Top issues: latency, UI.',
 *   artifacts: [],
 * });
 *
 * // Agent A acknowledges
 * handoff.acknowledge(task.id, 'manager');
 * ```
 */
export class A2ATaskHandoff {
  private readonly config: Required<A2ATaskHandoffConfig>;
  private tasks: Map<string, A2ATask> = new Map();
  private timeoutIntervalId: ReturnType<typeof setInterval> | null = null;

  // Indexes for fast lookup
  private senderIndex: Map<string, Set<string>> = new Map(); // senderDID -> Set<taskId>
  private receiverIndex: Map<string, Set<string>> = new Map(); // receiverDID -> Set<taskId>

  constructor(config?: A2ATaskHandoffConfig) {
    this.config = {
      defaultTimeoutMs: config?.defaultTimeoutMs ?? 300_000,
      maxTasksPerAgent: config?.maxTasksPerAgent ?? 50,
      maxTotalTasks: config?.maxTotalTasks ?? 10000,
      autoTimeout: config?.autoTimeout ?? true,
      timeoutCheckIntervalMs: config?.timeoutCheckIntervalMs ?? 10000,
      onTaskEvent: config?.onTaskEvent ?? (() => {}),
    };

    if (this.config.autoTimeout && typeof setInterval !== 'undefined') {
      this.startTimeoutChecker();
    }
  }

  // =========================================================================
  // Task Lifecycle
  // =========================================================================

  /**
   * Propose a new task from one agent to another.
   *
   * @returns The created task in 'proposed' state
   */
  propose(params: {
    senderAgentId: string;
    receiverAgentId: string;
    title: string;
    description: string;
    priority?: TaskPriority;
    sceneId: string;
    context?: Record<string, unknown>;
    requiredCapabilities?: string[];
    deadline?: string;
    timeoutMs?: number;
    parentTaskId?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): A2ATask {
    const senderDID = createDID(params.senderAgentId);
    const receiverDID = createDID(params.receiverAgentId);
    const now = new Date().toISOString();

    const task: A2ATask = {
      id: `task-${++taskIdCounter}-${Date.now()}`,
      title: params.title,
      description: params.description,
      state: 'proposed',
      priority: params.priority ?? 'medium',
      senderDID,
      receiverDID,
      originSceneId: params.sceneId,
      activeSceneId: params.sceneId,
      context: params.context ?? {},
      requiredCapabilities: params.requiredCapabilities ?? [],
      stateHistory: [{
        from: 'proposed',
        to: 'proposed',
        triggeredBy: senderDID,
        timestamp: now,
        reason: 'Task proposed',
        sceneId: params.sceneId,
      }],
      createdAt: now,
      updatedAt: now,
      deadline: params.deadline,
      timeoutMs: params.timeoutMs ?? this.config.defaultTimeoutMs,
      parentTaskId: params.parentTaskId,
      childTaskIds: [],
      tags: params.tags ?? [],
      metadata: params.metadata ?? {},
    };

    this.tasks.set(task.id, task);
    this.addToIndex(this.senderIndex, senderDID, task.id);
    this.addToIndex(this.receiverIndex, receiverDID, task.id);

    // Link to parent if exists
    if (params.parentTaskId) {
      const parent = this.tasks.get(params.parentTaskId);
      if (parent) {
        parent.childTaskIds.push(task.id);
      }
    }

    this.enforceLimits();
    this.emitEvent('proposed', task);

    return task;
  }

  /**
   * Accept a proposed task.
   */
  accept(taskId: string, receiverAgentId: string, sceneId?: string): A2ATask | null {
    return this.transition(taskId, receiverAgentId, 'accepted', sceneId, 'Task accepted');
  }

  /**
   * Reject a proposed task.
   */
  reject(taskId: string, receiverAgentId: string, reason: string, sceneId?: string): A2ATask | null {
    const task = this.transition(taskId, receiverAgentId, 'rejected', sceneId, reason);
    if (task) {
      task.rejectionReason = reason;
    }
    return task;
  }

  /**
   * Mark a task as in progress.
   */
  startProgress(taskId: string, receiverAgentId: string, sceneId?: string): A2ATask | null {
    return this.transition(taskId, receiverAgentId, 'in_progress', sceneId, 'Work started');
  }

  /**
   * Complete a task with results.
   */
  complete(
    taskId: string,
    receiverAgentId: string,
    result: Omit<TaskResult, 'completedAt' | 'durationMs'>,
    sceneId?: string,
  ): A2ATask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const durationMs = Date.now() - new Date(task.createdAt).getTime();

    task.result = {
      ...result,
      durationMs,
      completedAt: new Date().toISOString(),
    };

    return this.transition(taskId, receiverAgentId, 'completed', sceneId, result.summary);
  }

  /**
   * Mark a task as failed.
   */
  fail(taskId: string, receiverAgentId: string, reason: string, sceneId?: string): A2ATask | null {
    const task = this.transition(taskId, receiverAgentId, 'failed', sceneId, reason);
    if (task) {
      task.failureReason = reason;
    }
    return task;
  }

  /**
   * Cancel a task (sender only).
   */
  cancel(taskId: string, senderAgentId: string, reason: string, sceneId?: string): A2ATask | null {
    const task = this.transition(taskId, senderAgentId, 'cancelled', sceneId, reason);
    if (task) {
      task.cancellationReason = reason;
    }
    return task;
  }

  /**
   * Acknowledge task completion (sender acknowledges results).
   */
  acknowledge(taskId: string, senderAgentId: string, sceneId?: string): A2ATask | null {
    return this.transition(taskId, senderAgentId, 'acknowledged', sceneId, 'Results acknowledged');
  }

  // =========================================================================
  // Subtask Decomposition
  // =========================================================================

  /**
   * Decompose a task into subtasks.
   * Creates child tasks linked to the parent.
   */
  decompose(
    parentTaskId: string,
    subtasks: Array<{
      receiverAgentId: string;
      title: string;
      description: string;
      priority?: TaskPriority;
      context?: Record<string, unknown>;
      requiredCapabilities?: string[];
    }>,
    senderAgentId: string,
    sceneId: string,
  ): A2ATask[] {
    const parent = this.tasks.get(parentTaskId);
    if (!parent) return [];

    return subtasks.map(sub =>
      this.propose({
        senderAgentId,
        receiverAgentId: sub.receiverAgentId,
        title: sub.title,
        description: sub.description,
        priority: sub.priority ?? parent.priority,
        sceneId,
        context: { ...parent.context, ...sub.context },
        requiredCapabilities: sub.requiredCapabilities,
        parentTaskId,
        tags: parent.tags,
      }),
    );
  }

  /**
   * Check if all subtasks of a parent are complete.
   */
  areSubtasksComplete(parentTaskId: string): boolean {
    const parent = this.tasks.get(parentTaskId);
    if (!parent || parent.childTaskIds.length === 0) return true;

    return parent.childTaskIds.every(childId => {
      const child = this.tasks.get(childId);
      return child && (child.state === 'completed' || child.state === 'acknowledged');
    });
  }

  /**
   * Get all subtask results for a parent task.
   */
  getSubtaskResults(parentTaskId: string): Array<{ taskId: string; result?: TaskResult }> {
    const parent = this.tasks.get(parentTaskId);
    if (!parent) return [];

    return parent.childTaskIds.map(childId => {
      const child = this.tasks.get(childId);
      return { taskId: childId, result: child?.result };
    });
  }

  // =========================================================================
  // Query
  // =========================================================================

  /**
   * Get a task by ID.
   */
  getTask(taskId: string): A2ATask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Query tasks with filters.
   */
  query(filters: TaskQuery): A2ATask[] {
    let results = Array.from(this.tasks.values());

    if (filters.senderDID) {
      const did = filters.senderDID.startsWith('did:') ? filters.senderDID : createDID(filters.senderDID);
      results = results.filter(t => t.senderDID === did);
    }
    if (filters.receiverDID) {
      const did = filters.receiverDID.startsWith('did:') ? filters.receiverDID : createDID(filters.receiverDID);
      results = results.filter(t => t.receiverDID === did);
    }
    if (filters.states && filters.states.length > 0) {
      const stateSet = new Set(filters.states);
      results = results.filter(t => stateSet.has(t.state));
    }
    if (filters.priorities && filters.priorities.length > 0) {
      const prioSet = new Set(filters.priorities);
      results = results.filter(t => prioSet.has(t.priority));
    }
    if (filters.sceneId) {
      results = results.filter(t =>
        t.originSceneId === filters.sceneId || t.activeSceneId === filters.sceneId,
      );
    }
    if (filters.tags && filters.tags.length > 0) {
      const tagSet = new Set(filters.tags);
      results = results.filter(t => t.tags.some(tag => tagSet.has(tag)));
    }
    if (filters.parentTaskId) {
      results = results.filter(t => t.parentTaskId === filters.parentTaskId);
    }

    // Sort
    const sortBy = filters.sortBy ?? 'createdAt';
    const sortDir = filters.sortDirection ?? 'desc';
    results.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'updatedAt') {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else if (sortBy === 'priority') {
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get tasks sent by an agent.
   */
  getTasksSentBy(agentId: string): A2ATask[] {
    const did = createDID(agentId);
    const taskIds = this.senderIndex.get(did);
    if (!taskIds) return [];
    return Array.from(taskIds)
      .map(id => this.tasks.get(id))
      .filter((t): t is A2ATask => t !== undefined);
  }

  /**
   * Get tasks received by an agent.
   */
  getTasksReceivedBy(agentId: string): A2ATask[] {
    const did = createDID(agentId);
    const taskIds = this.receiverIndex.get(did);
    if (!taskIds) return [];
    return Array.from(taskIds)
      .map(id => this.tasks.get(id))
      .filter((t): t is A2ATask => t !== undefined);
  }

  /**
   * Get pending tasks for an agent (proposed, waiting for acceptance).
   */
  getPendingTasks(agentId: string): A2ATask[] {
    return this.getTasksReceivedBy(agentId).filter(t =>
      t.state === 'proposed',
    );
  }

  /**
   * Get active tasks for an agent (accepted or in_progress).
   */
  getActiveTasks(agentId: string): A2ATask[] {
    return this.getTasksReceivedBy(agentId).filter(t =>
      t.state === 'accepted' || t.state === 'in_progress',
    );
  }

  // =========================================================================
  // Scene Integration
  // =========================================================================

  /**
   * Update the active scene for all of an agent's tasks.
   * Called on scene transition.
   */
  updateActiveScene(agentId: string, newSceneId: string): number {
    const did = createDID(agentId);
    let updated = 0;

    // Update tasks where agent is receiver and task is active
    const receivedIds = this.receiverIndex.get(did);
    if (receivedIds) {
      for (const taskId of receivedIds) {
        const task = this.tasks.get(taskId);
        if (task && (task.state === 'accepted' || task.state === 'in_progress')) {
          task.activeSceneId = newSceneId;
          task.updatedAt = new Date().toISOString();
          updated++;
        }
      }
    }

    return updated;
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  /**
   * Get task handoff metrics.
   */
  getMetrics(): A2ATaskHandoffMetrics {
    const all = Array.from(this.tasks.values());

    const byState: Record<TaskState, number> = {
      proposed: 0, accepted: 0, rejected: 0, in_progress: 0,
      completed: 0, failed: 0, cancelled: 0, acknowledged: 0,
    };
    const byPriority: Record<TaskPriority, number> = {
      critical: 0, high: 0, medium: 0, low: 0,
    };

    const completionTimes: number[] = [];
    let completedCount = 0;
    let successCount = 0;
    let overdueCount = 0;
    const senders = new Set<string>();
    const receivers = new Set<string>();

    for (const task of all) {
      byState[task.state]++;
      byPriority[task.priority]++;
      senders.add(task.senderDID);
      receivers.add(task.receiverDID);

      if (task.state === 'completed' || task.state === 'acknowledged') {
        completedCount++;
        if (task.result?.success) successCount++;
        if (task.result?.durationMs) completionTimes.push(task.result.durationMs);
      }

      if (task.deadline && new Date(task.deadline) < new Date() &&
          task.state !== 'completed' && task.state !== 'acknowledged' &&
          task.state !== 'cancelled' && task.state !== 'failed') {
        overdueCount++;
      }
    }

    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    return {
      totalTasks: all.length,
      byState,
      byPriority,
      avgCompletionTimeMs: Math.round(avgCompletionTime),
      successRate: completedCount > 0
        ? Math.round((successCount / completedCount) * 1000) / 1000
        : 0,
      inProgressTasks: byState.in_progress + byState.accepted,
      overdueTasks: overdueCount,
      uniqueSenders: senders.size,
      uniqueReceivers: receivers.size,
    };
  }

  /**
   * Get total number of tasks.
   */
  get size(): number {
    return this.tasks.size;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Clear all state and stop timeout checker.
   */
  destroy(): void {
    if (this.timeoutIntervalId !== null) {
      clearInterval(this.timeoutIntervalId);
      this.timeoutIntervalId = null;
    }
    this.tasks.clear();
    this.senderIndex.clear();
    this.receiverIndex.clear();
  }

  // =========================================================================
  // Internals
  // =========================================================================

  /**
   * Perform a state transition on a task.
   */
  private transition(
    taskId: string,
    agentId: string,
    newState: TaskState,
    sceneId?: string,
    reason?: string,
  ): A2ATask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const did = createDID(agentId);
    const now = new Date().toISOString();
    const scene = sceneId ?? task.activeSceneId;

    // Validate state transition
    if (!this.isValidTransition(task.state, newState)) {
      return null;
    }

    // Record transition
    task.stateHistory.push({
      from: task.state,
      to: newState,
      triggeredBy: did,
      timestamp: now,
      reason,
      sceneId: scene,
    });

    task.state = newState;
    task.updatedAt = now;

    this.emitEvent(newState as TaskHandoffEvent['type'], task);

    return task;
  }

  /**
   * Validate that a state transition is allowed.
   */
  private isValidTransition(from: TaskState, to: TaskState): boolean {
    const validTransitions: Record<TaskState, TaskState[]> = {
      proposed: ['accepted', 'rejected', 'cancelled'],
      accepted: ['in_progress', 'cancelled', 'failed'],
      rejected: [], // Terminal state
      in_progress: ['completed', 'failed', 'cancelled'],
      completed: ['acknowledged'],
      failed: ['proposed'], // Can retry
      cancelled: [], // Terminal state
      acknowledged: [], // Terminal state
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Emit a task event.
   */
  private emitEvent(type: TaskHandoffEvent['type'], task: A2ATask): void {
    this.config.onTaskEvent({
      type,
      task,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add to index helper.
   */
  private addToIndex(index: Map<string, Set<string>>, key: string, taskId: string): void {
    if (!index.has(key)) {
      index.set(key, new Set());
    }
    index.get(key)!.add(taskId);
  }

  /**
   * Start the timeout checker interval.
   */
  private startTimeoutChecker(): void {
    this.timeoutIntervalId = setInterval(() => {
      this.checkTimeouts();
    }, this.config.timeoutCheckIntervalMs);
  }

  /**
   * Check for timed-out tasks.
   */
  private checkTimeouts(): void {
    const now = Date.now();

    for (const task of this.tasks.values()) {
      if (task.state !== 'proposed' && task.state !== 'accepted' && task.state !== 'in_progress') {
        continue;
      }

      if (task.timeoutMs) {
        const age = now - new Date(task.createdAt).getTime();
        if (age > task.timeoutMs) {
          task.state = 'failed';
          task.failureReason = `Task timed out after ${task.timeoutMs}ms`;
          task.updatedAt = new Date().toISOString();
          task.stateHistory.push({
            from: task.state,
            to: 'failed',
            triggeredBy: 'system',
            timestamp: new Date().toISOString(),
            reason: 'Timeout',
            sceneId: task.activeSceneId,
          });
          this.emitEvent('timeout', task);
        }
      }
    }
  }

  /**
   * Enforce task limits.
   */
  private enforceLimits(): void {
    if (this.tasks.size <= this.config.maxTotalTasks) return;

    // Remove oldest completed/acknowledged/cancelled/failed tasks
    const removable = Array.from(this.tasks.values())
      .filter(t =>
        t.state === 'acknowledged' || t.state === 'cancelled' ||
        t.state === 'rejected' || t.state === 'failed',
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const toRemove = this.tasks.size - this.config.maxTotalTasks;
    for (let i = 0; i < toRemove && i < removable.length; i++) {
      const task = removable[i];
      this.tasks.delete(task.id);
      this.senderIndex.get(task.senderDID)?.delete(task.id);
      this.receiverIndex.get(task.receiverDID)?.delete(task.id);
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let _handoff: A2ATaskHandoff | null = null;

/**
 * Get the singleton A2ATaskHandoff instance.
 */
export function getA2ATaskHandoff(config?: A2ATaskHandoffConfig): A2ATaskHandoff {
  if (!_handoff) {
    _handoff = new A2ATaskHandoff(config);
  }
  return _handoff;
}

/**
 * Reset the task handoff manager (for testing).
 */
export function resetA2ATaskHandoff(): void {
  if (_handoff) {
    _handoff.destroy();
    _handoff = null;
  }
}
