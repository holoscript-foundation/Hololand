#!/usr/bin/env node
/**
 * Agent Swarm Task Decomposition — Headless Demo #2
 *
 * Proves HoloScript value WITHOUT spatial rendering (Door 1 adoption).
 * A coordinator agent decomposes a complex task, then 5 worker agents
 * claim subtasks based on skill tags, execute in parallel, and report
 * results back through broadcast channels for final aggregation.
 *
 * Architecture mirrors:
 *   - AgentMessage (broadcast channels)  from @holoscript/core AgentTypes
 *   - AgentState.knowledge (Map store)   from @holoscript/core AgentTypes
 *   - @autonomous trait                  from @holoscript/core TraitTypes
 *   - Skill-based routing                from @holoscript/agent-protocol
 *   - Parallel execution model           from @holoscript/agent-protocol
 *
 * Run:  node examples/headless/task-swarm.mjs
 *       node examples/headless/task-swarm.mjs --task "Build a web scraping pipeline"
 *       node examples/headless/task-swarm.mjs --workers 3 --task "Design a REST API"
 *
 * @license Elastic-2.0
 */

// =============================================================================
// BROADCAST CHANNEL — mirrors HoloScript AgentMessage broadcast pattern
// =============================================================================

class BroadcastChannel {
  /** @type {Map<string, Set<(msg: object) => void>>} */
  #channels = new Map();
  /** @type {object[]} */
  #history = [];

  /**
   * Subscribe to a named channel.
   * @param {string} channel
   * @param {(msg: object) => void} handler
   */
  subscribe(channel, handler) {
    if (!this.#channels.has(channel)) this.#channels.set(channel, new Set());
    this.#channels.get(channel).add(handler);
  }

  /**
   * Unsubscribe from a named channel.
   * @param {string} channel
   * @param {(msg: object) => void} handler
   */
  unsubscribe(channel, handler) {
    this.#channels.get(channel)?.delete(handler);
  }

  /**
   * Publish a message to a channel (broadcast pattern from AgentTypes.ts).
   * @param {string} channel
   * @param {object} message
   */
  publish(channel, message) {
    const enriched = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      channel,
    };
    this.#history.push(enriched);
    const handlers = this.#channels.get(channel);
    if (handlers) {
      for (const handler of handlers) {
        try { handler(enriched); }
        catch (err) { console.error(`[BroadcastChannel] Handler error on ${channel}:`, err.message); }
      }
    }
  }

  /** Return full message history for transcript generation. */
  getHistory() { return [...this.#history]; }
}

// =============================================================================
// @knowledge TRAIT — persistent agent memory (mirrors AgentState.knowledge)
// =============================================================================

class KnowledgeStore {
  /** @type {Map<string, unknown>} */
  #store = new Map();
  /** @type {Array<{key: string, value: unknown, timestamp: number}>} */
  #log = [];

  get(key) { return this.#store.get(key); }

  set(key, value) {
    this.#store.set(key, value);
    this.#log.push({ key, value, timestamp: Date.now() });
  }

  has(key) { return this.#store.has(key); }

  /** Append to an array-valued key. */
  append(key, item) {
    const arr = this.#store.get(key) ?? [];
    arr.push(item);
    this.set(key, arr);
  }

  /** Increment a numeric key. */
  increment(key, amount = 1) {
    const val = this.#store.get(key) ?? 0;
    this.set(key, val + amount);
  }

  /** Return all entries as a plain object for JSON serialization. */
  toJSON() {
    const obj = {};
    for (const [k, v] of this.#store) obj[k] = v;
    return obj;
  }

  /** Return the full mutation log. */
  getLog() { return [...this.#log]; }
}

// =============================================================================
// TASK DEFINITIONS — decomposition templates for complex tasks
// =============================================================================

/**
 * @typedef {Object} Subtask
 * @property {string}   id
 * @property {string}   title
 * @property {string}   description
 * @property {string[]} requiredSkills - skill tags needed to execute
 * @property {number}   estimatedMs   - simulated execution time
 * @property {string[]} dependencies  - subtask IDs that must complete first
 * @property {'pending'|'claimed'|'in_progress'|'completed'|'failed'} status
 * @property {string|null} assignedTo - worker agent ID
 */

/**
 * Decomposition library: maps high-level tasks to subtask trees.
 * In production HoloScript, this would use LLM-based decomposition;
 * here we use deterministic templates to ensure reproducible demos.
 */
const TASK_DECOMPOSITIONS = {
  'Build a web scraping pipeline': [
    {
      id: 'st-01', title: 'Design URL Schema',
      description: 'Define target URL patterns and crawl boundaries. Establish rate limiting rules and robots.txt compliance checks.',
      requiredSkills: ['architecture', 'networking'],
      estimatedMs: 120, dependencies: [],
    },
    {
      id: 'st-02', title: 'Implement HTML Parser',
      description: 'Build DOM parser with CSS selector support. Handle malformed HTML gracefully with fallback regex extraction.',
      requiredSkills: ['parsing', 'data-processing'],
      estimatedMs: 200, dependencies: [],
    },
    {
      id: 'st-03', title: 'Build Request Queue',
      description: 'Create priority queue for HTTP requests with retry logic, exponential backoff, and concurrent request limiting.',
      requiredSkills: ['networking', 'concurrency'],
      estimatedMs: 180, dependencies: ['st-01'],
    },
    {
      id: 'st-04', title: 'Create Data Store',
      description: 'Design schema and implement storage layer for scraped data. Support deduplication and incremental updates.',
      requiredSkills: ['data-processing', 'storage'],
      estimatedMs: 150, dependencies: [],
    },
    {
      id: 'st-05', title: 'Build Monitoring Dashboard',
      description: 'Create real-time monitoring for crawl progress, error rates, and throughput metrics. Add alerting for failures.',
      requiredSkills: ['monitoring', 'architecture'],
      estimatedMs: 160, dependencies: ['st-03', 'st-04'],
    },
    {
      id: 'st-06', title: 'Integration Testing',
      description: 'End-to-end test with mock HTTP server. Verify data flow from URL discovery through storage. Load test at 100 req/s.',
      requiredSkills: ['testing', 'networking'],
      estimatedMs: 250, dependencies: ['st-02', 'st-03', 'st-04'],
    },
    {
      id: 'st-07', title: 'Write Documentation',
      description: 'API reference, architecture diagram, deployment guide, and runbook for common failure modes.',
      requiredSkills: ['documentation'],
      estimatedMs: 100, dependencies: ['st-05', 'st-06'],
    },
  ],

  'Design a REST API': [
    {
      id: 'st-01', title: 'Define Resource Models',
      description: 'Design data models for API resources. Establish relationships, constraints, and validation rules.',
      requiredSkills: ['architecture', 'data-processing'],
      estimatedMs: 140, dependencies: [],
    },
    {
      id: 'st-02', title: 'Design Endpoint Schema',
      description: 'Map CRUD operations to REST endpoints. Define request/response schemas with OpenAPI 3.0 spec.',
      requiredSkills: ['architecture', 'documentation'],
      estimatedMs: 160, dependencies: ['st-01'],
    },
    {
      id: 'st-03', title: 'Implement Auth Layer',
      description: 'Build JWT-based authentication with refresh tokens. Add role-based access control middleware.',
      requiredSkills: ['security', 'networking'],
      estimatedMs: 200, dependencies: [],
    },
    {
      id: 'st-04', title: 'Build Route Handlers',
      description: 'Implement endpoint handlers with input validation, error handling, and response formatting.',
      requiredSkills: ['networking', 'data-processing'],
      estimatedMs: 220, dependencies: ['st-01', 'st-02'],
    },
    {
      id: 'st-05', title: 'Add Rate Limiting',
      description: 'Implement token-bucket rate limiter with per-user and global limits. Add Redis-backed distributed state.',
      requiredSkills: ['concurrency', 'networking'],
      estimatedMs: 130, dependencies: ['st-03'],
    },
    {
      id: 'st-06', title: 'Write API Tests',
      description: 'Unit tests for handlers, integration tests for auth flow, contract tests against OpenAPI spec.',
      requiredSkills: ['testing', 'documentation'],
      estimatedMs: 190, dependencies: ['st-04', 'st-05'],
    },
  ],

  // Default decomposition for any unrecognized task
  _default: [
    {
      id: 'st-01', title: 'Requirements Analysis',
      description: 'Analyze the task scope, identify stakeholders, and define acceptance criteria.',
      requiredSkills: ['architecture', 'documentation'],
      estimatedMs: 100, dependencies: [],
    },
    {
      id: 'st-02', title: 'Architecture Design',
      description: 'Design system architecture, define component boundaries, and select technology stack.',
      requiredSkills: ['architecture', 'concurrency'],
      estimatedMs: 150, dependencies: ['st-01'],
    },
    {
      id: 'st-03', title: 'Core Implementation',
      description: 'Implement the primary business logic and data processing pipeline.',
      requiredSkills: ['data-processing', 'parsing'],
      estimatedMs: 250, dependencies: ['st-02'],
    },
    {
      id: 'st-04', title: 'Network Layer',
      description: 'Build external integrations, API clients, and communication protocols.',
      requiredSkills: ['networking', 'security'],
      estimatedMs: 180, dependencies: ['st-02'],
    },
    {
      id: 'st-05', title: 'Storage Layer',
      description: 'Implement data persistence, caching, and state management.',
      requiredSkills: ['storage', 'data-processing'],
      estimatedMs: 160, dependencies: ['st-03'],
    },
    {
      id: 'st-06', title: 'Testing Suite',
      description: 'Write unit, integration, and end-to-end tests. Achieve 80%+ code coverage.',
      requiredSkills: ['testing', 'monitoring'],
      estimatedMs: 200, dependencies: ['st-03', 'st-04', 'st-05'],
    },
    {
      id: 'st-07', title: 'Documentation & Deployment',
      description: 'Write user guide, API docs, and deployment runbook. Create CI/CD pipeline.',
      requiredSkills: ['documentation', 'architecture'],
      estimatedMs: 120, dependencies: ['st-06'],
    },
  ],
};

// =============================================================================
// WORKER AGENT — claims and executes subtasks based on skill tags
// =============================================================================

/** @type {Array<{id: string, name: string, skills: string[]}>} */
const WORKER_PROFILES = [
  {
    id: 'worker-alpha',
    name: 'Alpha (Architect)',
    skills: ['architecture', 'documentation', 'monitoring'],
  },
  {
    id: 'worker-beta',
    name: 'Beta (Network Eng)',
    skills: ['networking', 'security', 'concurrency'],
  },
  {
    id: 'worker-gamma',
    name: 'Gamma (Data Eng)',
    skills: ['data-processing', 'storage', 'parsing'],
  },
  {
    id: 'worker-delta',
    name: 'Delta (QA Lead)',
    skills: ['testing', 'monitoring', 'documentation'],
  },
  {
    id: 'worker-epsilon',
    name: 'Epsilon (Full-Stack)',
    skills: ['networking', 'data-processing', 'architecture'],
  },
];

class WorkerAgent {
  /**
   * @param {string}           id
   * @param {string}           name
   * @param {string[]}         skills
   * @param {BroadcastChannel} bus
   */
  constructor(id, name, skills, bus) {
    this.id = id;
    this.name = name;
    this.skills = skills;
    this.bus = bus;
    this.knowledge = new KnowledgeStore();
    this.busy = false;

    // Initialize knowledge
    this.knowledge.set('identity', { id, name, skills });
    this.knowledge.set('claimed_tasks', []);
    this.knowledge.set('completed_tasks', []);
    this.knowledge.set('failed_tasks', []);

    // Subscribe to task channel
    this.bus.subscribe('swarm:tasks', (msg) => this.#onTaskMessage(msg));
    // Subscribe to coordinator directives
    this.bus.subscribe('swarm:coordinator', (msg) => this.#onCoordinatorMessage(msg));
  }

  /**
   * Check if this worker can handle a subtask based on skill overlap.
   * @param {Subtask} subtask
   * @returns {number} skill match score (0 = no match, higher = better fit)
   */
  skillMatch(subtask) {
    const matched = subtask.requiredSkills.filter(s => this.skills.includes(s));
    return matched.length;
  }

  /**
   * Claim a subtask and announce to the swarm.
   * @param {Subtask} subtask
   */
  claim(subtask) {
    this.busy = true;
    this.knowledge.append('claimed_tasks', {
      subtaskId: subtask.id,
      title: subtask.title,
      claimedAt: Date.now(),
    });

    this.bus.publish('swarm:claims', {
      from: this.id,
      to: 'coordinator',
      type: 'response',
      action: 'task_claimed',
      payload: {
        subtaskId: subtask.id,
        workerId: this.id,
        workerName: this.name,
        skillMatch: this.skillMatch(subtask),
        matchedSkills: subtask.requiredSkills.filter(s => this.skills.includes(s)),
      },
      priority: 'high',
    });
  }

  /**
   * Execute a subtask (simulated with deterministic output).
   * @param {Subtask} subtask
   * @returns {{success: boolean, result: string, durationMs: number}}
   */
  execute(subtask) {
    const startTime = Date.now();

    // Report progress: started
    this.bus.publish('swarm:progress', {
      from: this.id,
      to: 'broadcast',
      type: 'notification',
      action: 'task_started',
      payload: {
        subtaskId: subtask.id,
        title: subtask.title,
        workerId: this.id,
        workerName: this.name,
      },
      priority: 'medium',
    });

    // Simulate execution with deterministic result
    const result = this.#simulateExecution(subtask);

    // Simulate elapsed time (we record it but don't actually sleep)
    const durationMs = subtask.estimatedMs + Math.floor(Math.random() * 50);

    // Report progress: completed
    this.bus.publish('swarm:progress', {
      from: this.id,
      to: 'broadcast',
      type: 'notification',
      action: result.success ? 'task_completed' : 'task_failed',
      payload: {
        subtaskId: subtask.id,
        title: subtask.title,
        workerId: this.id,
        workerName: this.name,
        durationMs,
        resultSummary: result.summary,
      },
      priority: result.success ? 'medium' : 'high',
    });

    // Report result to coordinator
    this.bus.publish('swarm:results', {
      from: this.id,
      to: 'coordinator',
      type: 'response',
      action: 'task_result',
      payload: {
        subtaskId: subtask.id,
        title: subtask.title,
        workerId: this.id,
        workerName: this.name,
        success: result.success,
        result: result.detail,
        artifacts: result.artifacts,
        durationMs,
      },
      priority: 'high',
    });

    // Update knowledge
    if (result.success) {
      this.knowledge.append('completed_tasks', {
        subtaskId: subtask.id,
        durationMs,
        completedAt: Date.now(),
      });
    } else {
      this.knowledge.append('failed_tasks', {
        subtaskId: subtask.id,
        reason: result.detail,
        failedAt: Date.now(),
      });
    }

    this.busy = false;
    return { success: result.success, result: result.detail, durationMs };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE
  // ---------------------------------------------------------------------------

  /**
   * Simulate task execution with deterministic outputs per subtask type.
   * @param {Subtask} subtask
   * @returns {{success: boolean, summary: string, detail: string, artifacts: string[]}}
   */
  #simulateExecution(subtask) {
    // All tasks succeed in this demo (deterministic)
    const titleLower = subtask.title.toLowerCase();

    if (titleLower.includes('design') || titleLower.includes('define') || titleLower.includes('requirements') || titleLower.includes('architecture')) {
      return {
        success: true,
        summary: `Design document produced with ${2 + Math.floor(subtask.requiredSkills.length * 1.5)} sections`,
        detail: `Completed "${subtask.title}": Produced design document covering ${subtask.description.split('.')[0].toLowerCase()}. Identified ${3 + subtask.requiredSkills.length} key components and ${2 + subtask.dependencies.length} integration points.`,
        artifacts: [`${subtask.id}-design.md`, `${subtask.id}-diagram.mmd`],
      };
    }

    if (titleLower.includes('implement') || titleLower.includes('build') || titleLower.includes('create') || titleLower.includes('core')) {
      return {
        success: true,
        summary: `Implementation complete: ${4 + subtask.requiredSkills.length} modules, ${12 + subtask.estimatedMs / 10} lines`,
        detail: `Completed "${subtask.title}": Implemented ${3 + subtask.requiredSkills.length} modules with full error handling. ${subtask.description.split('.')[0]}. Code passes lint and type checks.`,
        artifacts: [`${subtask.id}-src/`, `${subtask.id}-types.d.ts`],
      };
    }

    if (titleLower.includes('test')) {
      const testCount = 8 + subtask.dependencies.length * 4;
      return {
        success: true,
        summary: `${testCount} tests written, all passing, ${78 + subtask.dependencies.length * 3}% coverage`,
        detail: `Completed "${subtask.title}": Wrote ${testCount} tests (${Math.floor(testCount * 0.5)} unit, ${Math.floor(testCount * 0.3)} integration, ${Math.ceil(testCount * 0.2)} e2e). Coverage: ${78 + subtask.dependencies.length * 3}%. All passing.`,
        artifacts: [`${subtask.id}-tests/`, `${subtask.id}-coverage.json`],
      };
    }

    if (titleLower.includes('document') || titleLower.includes('documentation')) {
      return {
        success: true,
        summary: `Documentation complete: ${3 + subtask.dependencies.length} guides produced`,
        detail: `Completed "${subtask.title}": Produced ${3 + subtask.dependencies.length} documentation artifacts. ${subtask.description.split('.')[0]}. Includes code examples and architecture diagrams.`,
        artifacts: [`${subtask.id}-docs/`, `${subtask.id}-api-reference.md`],
      };
    }

    if (titleLower.includes('monitor') || titleLower.includes('dashboard')) {
      return {
        success: true,
        summary: `Monitoring configured with ${2 + subtask.requiredSkills.length} metric dashboards`,
        detail: `Completed "${subtask.title}": Set up ${2 + subtask.requiredSkills.length} monitoring dashboards with real-time metrics. ${subtask.description.split('.')[0]}. Alert thresholds configured.`,
        artifacts: [`${subtask.id}-dashboard.json`, `${subtask.id}-alerts.yaml`],
      };
    }

    // Generic fallback
    return {
      success: true,
      summary: `Task completed successfully with ${subtask.requiredSkills.length} deliverables`,
      detail: `Completed "${subtask.title}": ${subtask.description.split('.')[0]}. Produced ${subtask.requiredSkills.length} deliverables aligned with requirements.`,
      artifacts: [`${subtask.id}-output/`],
    };
  }

  #onTaskMessage(msg) {
    // Store offered tasks in knowledge for later analysis
    if (msg.action === 'task_offered') {
      this.knowledge.append('tasks_seen', {
        subtaskId: msg.payload?.subtaskId,
        title: msg.payload?.title,
        timestamp: msg.timestamp,
      });
    }
  }

  #onCoordinatorMessage(msg) {
    if (msg.action === 'assignment_confirmed') {
      this.knowledge.set('current_assignment', msg.payload);
    }
  }
}

// =============================================================================
// COORDINATOR AGENT — decomposes tasks and orchestrates the swarm
// =============================================================================

class CoordinatorAgent {
  /**
   * @param {BroadcastChannel} bus
   */
  constructor(bus) {
    this.id = 'coordinator';
    this.name = 'Coordinator';
    this.bus = bus;
    this.knowledge = new KnowledgeStore();

    this.knowledge.set('task_tree', null);
    this.knowledge.set('assignments', {});
    this.knowledge.set('results', {});
    this.knowledge.set('timeline', []);

    // Subscribe to worker channels
    this.bus.subscribe('swarm:claims', (msg) => this.#onClaimMessage(msg));
    this.bus.subscribe('swarm:results', (msg) => this.#onResultMessage(msg));
    this.bus.subscribe('swarm:progress', (msg) => this.#onProgressMessage(msg));
  }

  /**
   * Decompose a complex task into subtasks.
   * Uses deterministic decomposition templates.
   * @param {string} task
   * @returns {Subtask[]}
   */
  decompose(task) {
    const template = TASK_DECOMPOSITIONS[task] ?? TASK_DECOMPOSITIONS._default;
    const subtasks = template.map(t => ({
      ...t,
      status: 'pending',
      assignedTo: null,
    }));

    this.knowledge.set('task_tree', {
      rootTask: task,
      subtasks,
      decomposedAt: Date.now(),
    });

    this.knowledge.append('timeline', {
      event: 'task_decomposed',
      task,
      subtaskCount: subtasks.length,
      timestamp: Date.now(),
    });

    // Announce decomposition
    this.bus.publish('swarm:coordinator', {
      from: this.id,
      to: 'broadcast',
      type: 'event',
      action: 'task_decomposed',
      payload: {
        rootTask: task,
        subtasks: subtasks.map(s => ({
          id: s.id,
          title: s.title,
          requiredSkills: s.requiredSkills,
          dependencies: s.dependencies,
        })),
      },
      priority: 'critical',
    });

    return subtasks;
  }

  /**
   * Find the best worker for a subtask based on skill matching.
   * @param {Subtask} subtask
   * @param {WorkerAgent[]} workers
   * @returns {WorkerAgent|null}
   */
  findBestWorker(subtask, workers) {
    let bestWorker = null;
    let bestScore = 0;

    for (const worker of workers) {
      if (worker.busy) continue;
      const score = worker.skillMatch(subtask);
      if (score > bestScore) {
        bestScore = score;
        bestWorker = worker;
      }
    }

    // Fallback: if no skill match, assign to any available worker
    if (!bestWorker) {
      bestWorker = workers.find(w => !w.busy) ?? null;
    }

    return bestWorker;
  }

  /**
   * Check if a subtask's dependencies are all completed.
   * @param {Subtask} subtask
   * @param {Map<string, Subtask>} subtaskMap
   * @returns {boolean}
   */
  dependenciesMet(subtask, subtaskMap) {
    return subtask.dependencies.every(depId => {
      const dep = subtaskMap.get(depId);
      return dep && dep.status === 'completed';
    });
  }

  /**
   * Record a task assignment.
   * @param {string} subtaskId
   * @param {string} workerId
   * @param {string} workerName
   */
  recordAssignment(subtaskId, workerId, workerName) {
    const assignments = this.knowledge.get('assignments') ?? {};
    assignments[subtaskId] = {
      workerId,
      workerName,
      assignedAt: Date.now(),
    };
    this.knowledge.set('assignments', assignments);

    this.knowledge.append('timeline', {
      event: 'task_assigned',
      subtaskId,
      workerId,
      workerName,
      timestamp: Date.now(),
    });

    this.bus.publish('swarm:coordinator', {
      from: this.id,
      to: workerId,
      type: 'request',
      action: 'assignment_confirmed',
      payload: { subtaskId, workerId, workerName },
      priority: 'high',
    });
  }

  /**
   * Record a task result.
   * @param {string} subtaskId
   * @param {object} result
   */
  recordResult(subtaskId, result) {
    const results = this.knowledge.get('results') ?? {};
    results[subtaskId] = result;
    this.knowledge.set('results', results);

    this.knowledge.append('timeline', {
      event: result.success ? 'task_completed' : 'task_failed',
      subtaskId,
      workerId: result.workerId,
      durationMs: result.durationMs,
      timestamp: Date.now(),
    });
  }

  /**
   * Aggregate all results into a final merged output.
   * @param {string} rootTask
   * @param {Subtask[]} subtasks
   * @returns {object}
   */
  aggregateResults(rootTask, subtasks) {
    const results = this.knowledge.get('results') ?? {};
    const assignments = this.knowledge.get('assignments') ?? {};
    const timeline = this.knowledge.get('timeline') ?? [];

    const completed = subtasks.filter(s => s.status === 'completed');
    const failed = subtasks.filter(s => s.status === 'failed');
    const allArtifacts = [];
    const resultDetails = [];

    for (const subtask of subtasks) {
      const result = results[subtask.id];
      const assignment = assignments[subtask.id];
      if (result) {
        resultDetails.push({
          subtaskId: subtask.id,
          title: subtask.title,
          assignedTo: assignment?.workerName ?? 'unassigned',
          success: result.success,
          summary: result.resultSummary ?? result.result,
          durationMs: result.durationMs,
          artifacts: result.artifacts ?? [],
        });
        allArtifacts.push(...(result.artifacts ?? []));
      }
    }

    // Compute total parallel execution time (critical path)
    const criticalPath = this.#computeCriticalPath(subtasks, results);

    const aggregated = {
      rootTask,
      status: failed.length === 0 ? 'SUCCESS' : 'PARTIAL_FAILURE',
      summary: `Completed ${completed.length}/${subtasks.length} subtasks. ${allArtifacts.length} artifacts produced. Critical path: ${criticalPath}ms.`,
      subtaskResults: resultDetails,
      artifacts: allArtifacts,
      criticalPathMs: criticalPath,
      totalSequentialMs: subtasks.reduce((sum, s) => sum + (results[s.id]?.durationMs ?? s.estimatedMs), 0),
      parallelSpeedup: (() => {
        const sequential = subtasks.reduce((sum, s) => sum + (results[s.id]?.durationMs ?? s.estimatedMs), 0);
        return sequential > 0 ? +(sequential / criticalPath).toFixed(2) : 1;
      })(),
    };

    this.knowledge.set('final_aggregation', aggregated);

    this.knowledge.append('timeline', {
      event: 'aggregation_complete',
      status: aggregated.status,
      timestamp: Date.now(),
    });

    // Broadcast final result
    this.bus.publish('swarm:coordinator', {
      from: this.id,
      to: 'broadcast',
      type: 'event',
      action: 'swarm_complete',
      payload: {
        status: aggregated.status,
        summary: aggregated.summary,
        parallelSpeedup: aggregated.parallelSpeedup,
      },
      priority: 'critical',
    });

    return aggregated;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE
  // ---------------------------------------------------------------------------

  /**
   * Compute critical path duration through the dependency graph.
   * @param {Subtask[]} subtasks
   * @param {Record<string, object>} results
   * @returns {number}
   */
  #computeCriticalPath(subtasks, results) {
    const durations = {};
    const subtaskMap = new Map(subtasks.map(s => [s.id, s]));

    // Topological sort + longest-path
    const memo = {};

    const longestPath = (id) => {
      if (memo[id] !== undefined) return memo[id];
      const subtask = subtaskMap.get(id);
      if (!subtask) return 0;

      const ownDuration = results[id]?.durationMs ?? subtask.estimatedMs;
      if (subtask.dependencies.length === 0) {
        memo[id] = ownDuration;
        return ownDuration;
      }

      const maxDepDuration = Math.max(...subtask.dependencies.map(depId => longestPath(depId)));
      memo[id] = maxDepDuration + ownDuration;
      return memo[id];
    };

    // Find maximum across all subtasks
    let criticalPath = 0;
    for (const subtask of subtasks) {
      criticalPath = Math.max(criticalPath, longestPath(subtask.id));
    }

    return criticalPath;
  }

  #onClaimMessage(msg) {
    if (msg.action === 'task_claimed') {
      this.knowledge.append('claims_received', {
        subtaskId: msg.payload?.subtaskId,
        workerId: msg.payload?.workerId,
        skillMatch: msg.payload?.skillMatch,
        timestamp: msg.timestamp,
      });
    }
  }

  #onResultMessage(msg) {
    if (msg.action === 'task_result') {
      // Results are recorded via recordResult() in the orchestrator loop
    }
  }

  #onProgressMessage(msg) {
    this.knowledge.append('progress_log', {
      action: msg.action,
      subtaskId: msg.payload?.subtaskId,
      workerId: msg.payload?.workerId,
      timestamp: msg.timestamp,
    });
  }
}

// =============================================================================
// SWARM ORCHESTRATOR — runs the full decomposition and execution protocol
// =============================================================================

class SwarmOrchestrator {
  /**
   * @param {object} options
   * @param {string} options.task      - the complex task to decompose
   * @param {number} [options.workerCount=5]
   * @param {boolean} [options.verbose=true]
   */
  constructor({ task, workerCount = 5, verbose = true }) {
    this.task = task;
    this.workerCount = Math.min(workerCount, WORKER_PROFILES.length);
    this.verbose = verbose;
    this.bus = new BroadcastChannel();

    // Create coordinator
    this.coordinator = new CoordinatorAgent(this.bus);

    // Create workers (up to workerCount)
    this.workers = WORKER_PROFILES.slice(0, this.workerCount).map(
      profile => new WorkerAgent(profile.id, profile.name, profile.skills, this.bus)
    );
  }

  /**
   * Execute the full swarm task decomposition protocol.
   * @returns {object} structured swarm execution transcript
   */
  run() {
    const startTime = Date.now();

    this.#log('='.repeat(72));
    this.#log('  AGENT SWARM TASK DECOMPOSITION');
    this.#log('  HoloScript Headless Demo #2 -- Door 1 Adoption Proof');
    this.#log('='.repeat(72));
    this.#log(`  Task: "${this.task}"`);
    this.#log(`  Workers: ${this.workers.map(w => w.name).join(', ')}`);
    this.#log(`  Coordinator: ${this.coordinator.name}`);
    this.#log(`  Protocol: DECOMPOSE -> ASSIGN -> EXECUTE -> AGGREGATE`);
    this.#log('='.repeat(72));
    this.#log('');

    // ---- PHASE 1: DECOMPOSE ----
    this.#log('--- PHASE 1: DECOMPOSE ---\n');
    const subtasks = this.coordinator.decompose(this.task);
    const subtaskMap = new Map(subtasks.map(s => [s.id, s]));

    this.#log(`Coordinator decomposed "${this.task}" into ${subtasks.length} subtasks:\n`);
    for (const st of subtasks) {
      const deps = st.dependencies.length > 0 ? ` (depends on: ${st.dependencies.join(', ')})` : ' (no dependencies)';
      this.#log(`  [${st.id}] ${st.title}`);
      this.#log(`          Skills: ${st.requiredSkills.join(', ')}${deps}`);
      this.#log(`          Est: ${st.estimatedMs}ms`);
    }
    this.#log('');

    // ---- PHASE 2: ASSIGN & EXECUTE (wave-based parallel execution) ----
    this.#log('--- PHASE 2: ASSIGN & EXECUTE (wave-based) ---\n');

    let wave = 0;
    const executionLog = [];

    while (subtasks.some(s => s.status === 'pending' || s.status === 'in_progress')) {
      wave++;
      this.#log(`  Wave ${wave}:`);

      // Find all subtasks whose dependencies are met and not yet started
      const ready = subtasks.filter(
        s => s.status === 'pending' && this.coordinator.dependenciesMet(s, subtaskMap)
      );

      if (ready.length === 0) {
        // All remaining tasks have unmet dependencies or are in progress
        // This shouldn't happen in our DAG, but guard against it
        this.#log('    [!] No tasks ready — dependency deadlock detected');
        break;
      }

      // Assign and execute each ready task
      const waveResults = [];
      for (const subtask of ready) {
        const worker = this.coordinator.findBestWorker(subtask, this.workers);
        if (!worker) {
          this.#log(`    [${subtask.id}] No available worker — deferred`);
          continue;
        }

        // Assign
        subtask.assignedTo = worker.id;
        subtask.status = 'in_progress';
        this.coordinator.recordAssignment(subtask.id, worker.id, worker.name);
        worker.claim(subtask);

        this.#log(`    [${subtask.id}] "${subtask.title}" -> ${worker.name} (skill match: ${worker.skillMatch(subtask)}/${subtask.requiredSkills.length})`);

        // Execute
        const result = worker.execute(subtask);
        subtask.status = result.success ? 'completed' : 'failed';

        this.coordinator.recordResult(subtask.id, {
          workerId: worker.id,
          workerName: worker.name,
          success: result.success,
          result: result.result,
          resultSummary: result.result.slice(0, 100),
          artifacts: result.success ? [`${subtask.id}-output/`] : [],
          durationMs: result.durationMs,
        });

        waveResults.push({
          subtaskId: subtask.id,
          title: subtask.title,
          worker: worker.name,
          success: result.success,
          durationMs: result.durationMs,
        });
      }

      executionLog.push({
        wave,
        tasksExecuted: waveResults.length,
        results: waveResults,
        timestamp: Date.now(),
      });

      this.#log('');
    }

    // ---- PHASE 3: AGGREGATE ----
    this.#log('--- PHASE 3: AGGREGATE ---\n');
    const aggregation = this.coordinator.aggregateResults(this.task, subtasks);

    this.#log(`  Status: ${aggregation.status}`);
    this.#log(`  ${aggregation.summary}`);
    this.#log(`  Sequential time: ${aggregation.totalSequentialMs}ms`);
    this.#log(`  Critical path:   ${aggregation.criticalPathMs}ms`);
    this.#log(`  Parallel speedup: ${aggregation.parallelSpeedup}x`);
    this.#log('');

    // ---- SUMMARY ----
    const durationMs = Date.now() - startTime;

    this.#log('='.repeat(72));
    this.#log('  SWARM EXECUTION COMPLETE');
    this.#log('='.repeat(72));
    this.#log(`  Duration: ${durationMs}ms`);
    this.#log(`  Messages exchanged: ${this.bus.getHistory().length}`);
    this.#log(`  Waves executed: ${wave}`);
    this.#log(`  Tasks completed: ${subtasks.filter(s => s.status === 'completed').length}/${subtasks.length}`);
    this.#log('');

    // Build structured output
    const output = this.#buildOutput(durationMs, subtasks, executionLog, aggregation);

    // Print JSON
    this.#log('\n--- STRUCTURED JSON OUTPUT ---\n');
    this.#log(JSON.stringify(output, null, 2));

    return output;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE
  // ---------------------------------------------------------------------------

  #log(msg) {
    if (this.verbose) console.log(msg);
  }

  #buildOutput(durationMs, subtasks, executionLog, aggregation) {
    return {
      meta: {
        demo: 'agent-swarm-task-decomposition',
        version: '1.0.0',
        holoscript_patterns: [
          'BroadcastChannel (AgentMessage.to = "broadcast")',
          '@autonomous trait (self-directed task claiming)',
          '@knowledge trait (AgentState.knowledge persistent Map)',
          'Skill-based routing (worker.skills vs subtask.requiredSkills)',
          'Wave-based parallel execution (dependency-aware scheduling)',
          'Result aggregation (coordinator merges worker outputs)',
        ],
        door: 'Door 1 -- Headless Adoption (no spatial rendering)',
        timestamp: new Date().toISOString(),
        durationMs,
      },
      swarm: {
        task: this.task,
        coordinator: {
          id: this.coordinator.id,
          name: this.coordinator.name,
        },
        workers: this.workers.map(w => ({
          id: w.id,
          name: w.name,
          skills: w.skills,
        })),
        workerCount: this.workers.length,
      },
      task_tree: {
        rootTask: this.task,
        subtasks: subtasks.map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
          requiredSkills: s.requiredSkills,
          dependencies: s.dependencies,
          estimatedMs: s.estimatedMs,
          status: s.status,
          assignedTo: s.assignedTo,
        })),
        dependencyEdges: subtasks.flatMap(s =>
          s.dependencies.map(dep => ({ from: dep, to: s.id }))
        ),
      },
      assignments: this.coordinator.knowledge.get('assignments') ?? {},
      execution_timeline: executionLog,
      aggregation: {
        status: aggregation.status,
        summary: aggregation.summary,
        subtaskResults: aggregation.subtaskResults,
        artifacts: aggregation.artifacts,
        criticalPathMs: aggregation.criticalPathMs,
        totalSequentialMs: aggregation.totalSequentialMs,
        parallelSpeedup: aggregation.parallelSpeedup,
      },
      knowledge_state: {
        coordinator: this.coordinator.knowledge.toJSON(),
        workers: Object.fromEntries(
          this.workers.map(w => [w.id, w.knowledge.toJSON()])
        ),
      },
      broadcast_log: {
        total_messages: this.bus.getHistory().length,
        channels: [...new Set(this.bus.getHistory().map(m => m.channel))],
        messages: this.bus.getHistory().map(m => ({
          id: m.id,
          channel: m.channel,
          from: m.from,
          to: m.to,
          action: m.action,
          priority: m.priority,
          timestamp: m.timestamp,
          payloadSummary: m.payload?.subtaskId
            ? `${m.payload.subtaskId}: ${m.payload.title ?? m.payload.resultSummary ?? m.action}`
            : JSON.stringify(m.payload).slice(0, 80),
        })),
      },
      wisdom_extracted: [
        {
          id: 'W.SWARM.01',
          domain: 'multi-agent',
          insight: 'Wave-based scheduling with dependency tracking achieves near-optimal parallelism without complex scheduling algorithms.',
          source: 'task-swarm-demo',
          tags: ['swarm', 'scheduling', 'parallelism'],
          createdAt: Date.now(),
        },
        {
          id: 'W.SWARM.02',
          domain: 'skill-routing',
          insight: 'Skill-tag matching with fallback assignment ensures all tasks are handled while preferring specialized workers.',
          source: 'task-swarm-demo',
          tags: ['routing', 'skills', 'assignment'],
          createdAt: Date.now(),
        },
        {
          id: 'P.SWARM.01',
          domain: 'multi-agent',
          problem: 'Complex tasks require decomposition and parallel execution across heterogeneous workers',
          solution: 'Coordinator decomposes into DAG, workers claim by skill match, wave scheduler respects dependencies, coordinator aggregates results with critical path analysis',
          tags: ['decomposition', 'dag', 'parallel', 'aggregation'],
          confidence: 0.95,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'P.SWARM.02',
          domain: 'broadcast-channels',
          problem: 'Workers need coordination without tight coupling',
          solution: 'Separate channels for tasks/claims/progress/results enable loose coupling while maintaining execution ordering through coordinator mediation',
          tags: ['channels', 'decoupling', 'coordination'],
          confidence: 0.92,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    };
  }
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  let task = 'Build a web scraping pipeline';
  let workerCount = 5;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--task' && args[i + 1]) {
      task = args[i + 1];
      i++;
    } else if (args[i] === '--workers' && args[i + 1]) {
      workerCount = Math.max(1, Math.min(5, parseInt(args[i + 1], 10) || 5));
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Agent Swarm Task Decomposition -- HoloScript Headless Demo #2

Usage:
  node task-swarm.mjs [options]

Options:
  --task <string>     Set the complex task to decompose (default: "Build a web scraping pipeline")
  --workers <number>  Number of worker agents, 1-5 (default: 5)
  --help, -h          Show this help message

Examples:
  node task-swarm.mjs
  node task-swarm.mjs --task "Design a REST API"
  node task-swarm.mjs --workers 3 --task "Build a recommendation engine"

Known Tasks (with custom decompositions):
  - "Build a web scraping pipeline" (7 subtasks)
  - "Design a REST API" (6 subtasks)
  - Any other string uses the default 7-subtask decomposition

Worker Agents:
  Alpha (Architect)    - architecture, documentation, monitoring
  Beta (Network Eng)   - networking, security, concurrency
  Gamma (Data Eng)     - data-processing, storage, parsing
  Delta (QA Lead)      - testing, monitoring, documentation
  Epsilon (Full-Stack) - networking, data-processing, architecture

HoloScript Patterns Demonstrated:
  - BroadcastChannel    Agent-to-agent pub/sub messaging
  - @autonomous trait   Workers self-direct based on skill matching
  - @knowledge trait    Persistent per-agent memory across execution waves
  - Skill routing       Task assignment by tag overlap scoring
  - Wave scheduling     Dependency-aware parallel execution
  - Result aggregation  Coordinator merges outputs with critical path analysis
`);
      process.exit(0);
    }
  }

  const orchestrator = new SwarmOrchestrator({ task, workerCount });
  const result = orchestrator.run();

  // Exit with success
  process.exit(0);
}

main();
