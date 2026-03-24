#!/usr/bin/env node
/**
 * Multi-Agent Debate Society — Headless Demo #1
 *
 * Proves HoloScript value WITHOUT spatial rendering (Door 1 adoption).
 * Three AI agents engage in structured debate using HoloScript's
 * broadcast channel pattern and @knowledge persistent memory trait.
 *
 * Architecture mirrors:
 *   - AgentMessage (broadcast channels)  from @holoscript/core AgentTypes
 *   - AgentState.knowledge (Map store)   from @holoscript/core AgentTypes
 *   - AgentPhase turn protocol           from @holoscript/agent-protocol
 *   - PWG knowledge format               from @holoscript/agent-protocol
 *
 * Run:  node examples/headless/debate-society.mjs
 *       node examples/headless/debate-society.mjs --topic "AI consciousness"
 *       node examples/headless/debate-society.mjs --rounds 2 --topic "Open source vs proprietary"
 *
 * @license Elastic-2.0
 */

// =============================================================================
// BROADCAST CHANNEL — mirrors HoloScript AgentMessage broadcast pattern
// =============================================================================

class BroadcastChannel {
  /** @type {Map<string, Set<(msg: AgentMessage) => void>>} */
  #channels = new Map();
  /** @type {AgentMessage[]} */
  #history = [];

  /**
   * Subscribe to a named channel.
   * @param {string} channel
   * @param {(msg: AgentMessage) => void} handler
   */
  subscribe(channel, handler) {
    if (!this.#channels.has(channel)) this.#channels.set(channel, new Set());
    this.#channels.get(channel).add(handler);
  }

  /**
   * Unsubscribe from a named channel.
   * @param {string} channel
   * @param {(msg: AgentMessage) => void} handler
   */
  unsubscribe(channel, handler) {
    this.#channels.get(channel)?.delete(handler);
  }

  /**
   * Publish a message to a channel (broadcast pattern from AgentTypes.ts).
   * @param {string} channel
   * @param {AgentMessage} message
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
// DEBATE PROTOCOL — phase definitions
// =============================================================================

/** @enum {string} */
const DebatePhase = {
  SETUP:    'SETUP',
  PROPOSE:  'PROPOSE',
  ARGUE:    'ARGUE',
  REBUT:    'REBUT',
  VOTE:     'VOTE',
  SUMMARY:  'SUMMARY',
};

const PHASE_ORDER = [
  DebatePhase.PROPOSE,
  DebatePhase.ARGUE,
  DebatePhase.REBUT,
  DebatePhase.VOTE,
];

// =============================================================================
// AGENT MESSAGE TYPES — follows AgentMessage schema from AgentTypes.ts
// =============================================================================

/**
 * @typedef {Object} AgentMessage
 * @property {string}  id
 * @property {string}  from       - agent_id of sender
 * @property {string}  to         - agent_id or 'broadcast'
 * @property {'request'|'response'|'notification'|'event'} type
 * @property {string}  action
 * @property {Record<string, unknown>} payload
 * @property {'low'|'medium'|'high'|'critical'} priority
 * @property {number}  timestamp
 * @property {string}  [channel]
 */

// =============================================================================
// DEBATER AGENT
// =============================================================================

class DebaterAgent {
  /**
   * @param {string}           id         - unique agent identifier
   * @param {string}           name       - display name
   * @param {string}           perspective - this agent's debating philosophy
   * @param {BroadcastChannel} bus        - shared broadcast channel
   */
  constructor(id, name, perspective, bus) {
    this.id = id;
    this.name = name;
    this.perspective = perspective;
    this.bus = bus;
    this.knowledge = new KnowledgeStore();

    // Initialize knowledge with identity & perspective
    this.knowledge.set('identity', { id, name, perspective });
    this.knowledge.set('arguments_made', []);
    this.knowledge.set('rebuttals_made', []);
    this.knowledge.set('votes_cast', []);
    this.knowledge.set('opponents_arguments', []);

    // Subscribe to debate channels
    this.bus.subscribe('debate:moderator', (msg) => this.#onModeratorMessage(msg));
    this.bus.subscribe('debate:floor', (msg) => this.#onFloorMessage(msg));
  }

  // ---------------------------------------------------------------------------
  // PHASE HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Generate a proposal for the debate topic.
   * @param {string} topic
   * @returns {string}
   */
  propose(topic) {
    this.knowledge.set('current_topic', topic);

    const proposals = {
      pragmatist: `From a pragmatic standpoint, "${topic}" should be evaluated by its measurable outcomes and real-world impact. We need concrete metrics, not abstract ideals. I propose we assess this through the lens of cost-benefit analysis and demonstrated results.`,
      idealist: `The question of "${topic}" fundamentally concerns our values and aspirations. Beyond mere utility, we must consider what kind of future we are building. I propose we evaluate this through ethical principles and long-term societal benefit.`,
      skeptic: `Before we rush to conclusions about "${topic}", we must acknowledge what we do NOT know. Every claim deserves scrutiny. I propose we apply rigorous falsification criteria and demand extraordinary evidence for extraordinary claims.`,
    };

    const proposal = proposals[this.perspective] ??
      `Regarding "${topic}", I believe we should consider multiple frameworks. My ${this.perspective} perspective suggests examining both the evidence and the underlying assumptions.`;

    this.knowledge.append('arguments_made', {
      phase: DebatePhase.PROPOSE,
      content: proposal,
      topic,
      timestamp: Date.now(),
    });

    this.bus.publish('debate:floor', {
      from: this.id,
      to: 'broadcast',
      type: 'notification',
      action: 'proposal',
      payload: { content: proposal, topic, perspective: this.perspective },
      priority: 'high',
    });

    return proposal;
  }

  /**
   * Build an argument in response to other proposals heard.
   * @param {string} topic
   * @returns {string}
   */
  argue(topic) {
    const opponentArgs = this.knowledge.get('opponents_arguments') ?? [];
    const lastOpponent = opponentArgs[opponentArgs.length - 1];

    const arguments_ = {
      pragmatist: [
        `The data clearly supports a results-oriented approach. While idealism sounds noble, history shows that measurable frameworks drive progress. Consider how empirical methods in ${topic.split(' ')[0]} have consistently outperformed theoretical approaches.`,
        `Let me strengthen my position with evidence: pragmatic evaluation has led to breakthroughs in every field. Abstract principles, while important for direction, cannot replace the discipline of measurement and iteration.`,
        `I acknowledge the skeptic's call for rigor — that IS pragmatism. But pure skepticism without constructive proposals leaves us paralyzed. We need actionable frameworks, not just doubt.`,
      ],
      idealist: [
        `Pure pragmatism risks a race to the bottom. If we only optimize for measurable outcomes, we lose sight of WHY those outcomes matter. The ethical dimension of "${topic}" cannot be reduced to metrics — it requires moral reasoning.`,
        `History's greatest advances came from idealists who refused to accept the status quo. The pragmatist measures what IS; the idealist envisions what OUGHT to be. Both are needed, but values must lead.`,
        `To the skeptic: healthy doubt is valuable, but radical skepticism becomes its own dogma. Some truths are self-evident and require commitment, not endless questioning.`,
      ],
      skeptic: [
        `Both the pragmatist and idealist assume their frameworks are correct — but on what basis? The pragmatist's "evidence" is filtered through assumptions. The idealist's "values" are culturally contingent. We must examine these foundations.`,
        `I note that my colleagues argue with conviction but insufficient uncertainty. In the domain of "${topic}", the literature shows significant disagreement among experts. Why should we be more certain than them?`,
        `Let me be constructive: the path forward requires acknowledging uncertainty explicitly. Bayesian reasoning — updating beliefs proportionally to evidence — bridges pragmatism and idealism without the dogmatism of either.`,
      ],
    };

    const pool = arguments_[this.perspective] ?? [`My ${this.perspective} perspective leads me to a nuanced view of "${topic}".`];
    const argIndex = (this.knowledge.get('arguments_made')?.length ?? 0) % pool.length;
    const argument = pool[argIndex];

    this.knowledge.append('arguments_made', {
      phase: DebatePhase.ARGUE,
      content: argument,
      respondingTo: lastOpponent?.from ?? null,
      timestamp: Date.now(),
    });

    this.bus.publish('debate:floor', {
      from: this.id,
      to: 'broadcast',
      type: 'notification',
      action: 'argument',
      payload: { content: argument, perspective: this.perspective },
      priority: 'medium',
    });

    return argument;
  }

  /**
   * Rebut the strongest opposing argument.
   * @param {string} topic
   * @returns {string}
   */
  rebut(topic) {
    const opponentArgs = this.knowledge.get('opponents_arguments') ?? [];

    const rebuttals = {
      pragmatist: `The idealist claims values must lead, but values without measurement are mere wishes. The skeptic demands certainty we can never achieve. I rebut both: iterative, evidence-based improvement is not "a race to the bottom" — it is the ONLY proven mechanism for progress. Show me a society that improved through pure idealism alone.`,
      idealist: `The pragmatist reduces human flourishing to spreadsheets. The skeptic reduces truth to probability distributions. I rebut both: there are moral facts — suffering is bad, flourishing is good — that no amount of "measurement" or "uncertainty" can relativize away. Our debate about "${topic}" must center these axioms.`,
      skeptic: `My esteemed colleagues both commit the same error: excessive confidence. The pragmatist is confident in their metrics. The idealist is confident in their values. I rebut both by noting that the history of "${topic}" is littered with confident predictions that proved wrong. Epistemic humility is not paralysis — it is the precondition for genuine learning.`,
    };

    const rebuttal = rebuttals[this.perspective] ??
      `I must challenge the assumptions underlying my opponents' positions on "${topic}".`;

    this.knowledge.append('rebuttals_made', {
      phase: DebatePhase.REBUT,
      content: rebuttal,
      opponentArgsSeen: opponentArgs.length,
      timestamp: Date.now(),
    });

    this.bus.publish('debate:floor', {
      from: this.id,
      to: 'broadcast',
      type: 'notification',
      action: 'rebuttal',
      payload: { content: rebuttal, perspective: this.perspective },
      priority: 'high',
    });

    return rebuttal;
  }

  /**
   * Cast a vote on which perspective was most compelling.
   * Agents cannot vote for themselves (enforced by moderator).
   * @param {Array<{id: string, name: string}>} candidates
   * @returns {{votedFor: string, reason: string}}
   */
  vote(candidates) {
    // Filter out self
    const others = candidates.filter(c => c.id !== this.id);
    const opponentArgs = this.knowledge.get('opponents_arguments') ?? [];

    // Heuristic: vote for the opponent with the most arguments recorded
    // (simulates "who made the strongest impression")
    const argCounts = {};
    for (const arg of opponentArgs) {
      if (arg.from !== this.id) {
        argCounts[arg.from] = (argCounts[arg.from] ?? 0) + 1;
      }
    }

    let votedFor = others[0];
    let maxArgs = 0;
    for (const candidate of others) {
      const count = argCounts[candidate.id] ?? 0;
      if (count > maxArgs) {
        maxArgs = count;
        votedFor = candidate;
      }
    }

    const reasons = {
      pragmatist: `I vote for ${votedFor.name} because their arguments, while I disagree on framework, demonstrated the most rigorous engagement with the evidence.`,
      idealist: `I vote for ${votedFor.name} because their position, despite our differences, showed genuine concern for the broader implications of this topic.`,
      skeptic: `I vote for ${votedFor.name} because they showed the most willingness to engage with counterarguments and update their position.`,
    };

    const reason = reasons[this.perspective] ?? `I vote for ${votedFor.name} based on argument quality.`;

    this.knowledge.append('votes_cast', {
      votedFor: votedFor.id,
      reason,
      timestamp: Date.now(),
    });

    this.bus.publish('debate:floor', {
      from: this.id,
      to: 'broadcast',
      type: 'notification',
      action: 'vote',
      payload: { votedFor: votedFor.id, votedForName: votedFor.name, reason },
      priority: 'critical',
    });

    return { votedFor: votedFor.id, reason };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE — message handlers
  // ---------------------------------------------------------------------------

  #onModeratorMessage(msg) {
    // Store moderator directives in knowledge
    if (msg.action === 'phase_change') {
      this.knowledge.set('current_phase', msg.payload.phase);
    }
    if (msg.action === 'rule_violation') {
      this.knowledge.append('violations_received', {
        rule: msg.payload.rule,
        timestamp: msg.timestamp,
      });
    }
  }

  #onFloorMessage(msg) {
    // Record other agents' arguments for knowledge persistence
    if (msg.from !== this.id) {
      this.knowledge.append('opponents_arguments', {
        from: msg.from,
        action: msg.action,
        content: msg.payload?.content,
        perspective: msg.payload?.perspective,
        timestamp: msg.timestamp,
      });
    }
  }
}

// =============================================================================
// MODERATOR AGENT — enforces rules and manages turn order
// =============================================================================

class ModeratorAgent {
  /**
   * @param {BroadcastChannel} bus
   */
  constructor(bus) {
    this.id = 'moderator';
    this.name = 'Moderator';
    this.bus = bus;
    this.knowledge = new KnowledgeStore();

    this.knowledge.set('rules', [
      'Each agent speaks once per phase before the next phase begins.',
      'Agents cannot vote for themselves.',
      'Arguments must address the topic; off-topic remarks are flagged.',
      'Personal attacks are prohibited; critique ideas, not agents.',
      'The moderator\'s phase transitions are final.',
    ]);
    this.knowledge.set('violations', []);
    this.knowledge.set('phase_log', []);
    this.knowledge.set('vote_tally', {});

    // Monitor debate floor for rule violations
    this.bus.subscribe('debate:floor', (msg) => this.#monitorFloor(msg));
  }

  /**
   * Announce a phase transition to all agents.
   * @param {string} phase
   * @param {object} [metadata]
   */
  announcePhase(phase, metadata = {}) {
    this.knowledge.append('phase_log', { phase, timestamp: Date.now(), ...metadata });

    this.bus.publish('debate:moderator', {
      from: this.id,
      to: 'broadcast',
      type: 'event',
      action: 'phase_change',
      payload: { phase, ...metadata },
      priority: 'critical',
    });
  }

  /**
   * Issue a rule violation warning.
   * @param {string} agentId
   * @param {string} rule
   * @param {string} detail
   */
  issueViolation(agentId, rule, detail) {
    this.knowledge.append('violations', { agentId, rule, detail, timestamp: Date.now() });

    this.bus.publish('debate:moderator', {
      from: this.id,
      to: agentId,
      type: 'notification',
      action: 'rule_violation',
      payload: { rule, detail },
      priority: 'high',
    });
  }

  /**
   * Tally votes and determine a winner.
   * @param {Array<{votedFor: string, voter: string}>} votes
   * @returns {{tally: Record<string, number>, winner: string|null}}
   */
  tallyVotes(votes) {
    const tally = {};
    for (const { votedFor, voter } of votes) {
      // Rule enforcement: cannot vote for self
      if (votedFor === voter) {
        this.issueViolation(voter, 'self-vote', 'Agents cannot vote for themselves.');
        continue;
      }
      tally[votedFor] = (tally[votedFor] ?? 0) + 1;
    }

    this.knowledge.set('vote_tally', tally);

    let winner = null;
    let maxVotes = 0;
    for (const [agentId, count] of Object.entries(tally)) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = agentId;
      }
    }

    // Check for tie
    const winners = Object.entries(tally).filter(([_, c]) => c === maxVotes);
    if (winners.length > 1) winner = null; // tie

    this.bus.publish('debate:moderator', {
      from: this.id,
      to: 'broadcast',
      type: 'event',
      action: 'vote_result',
      payload: { tally, winner, isTie: winner === null },
      priority: 'critical',
    });

    return { tally, winner };
  }

  #monitorFloor(msg) {
    // Simple rule check: flag empty arguments
    if (msg.action === 'argument' || msg.action === 'proposal' || msg.action === 'rebuttal') {
      if (!msg.payload?.content || msg.payload.content.trim().length < 10) {
        this.issueViolation(msg.from, 'insufficient-argument', 'Arguments must be substantive (10+ characters).');
      }
    }
  }
}

// =============================================================================
// DEBATE ORCHESTRATOR — runs the full protocol
// =============================================================================

class DebateOrchestrator {
  /**
   * @param {object} options
   * @param {string} options.topic
   * @param {number} [options.rounds=1]
   * @param {boolean} [options.verbose=true]
   */
  constructor({ topic, rounds = 1, verbose = true }) {
    this.topic = topic;
    this.rounds = rounds;
    this.verbose = verbose;
    this.bus = new BroadcastChannel();
    this.transcript = [];

    // Create moderator
    this.moderator = new ModeratorAgent(this.bus);

    // Create 3 debater agents with distinct perspectives
    this.agents = [
      new DebaterAgent('agent-pragmatist', 'Dr. Pragma', 'pragmatist', this.bus),
      new DebaterAgent('agent-idealist', 'Prof. Ideal', 'idealist', this.bus),
      new DebaterAgent('agent-skeptic', 'The Skeptic', 'skeptic', this.bus),
    ];
  }

  /**
   * Execute the full debate protocol.
   * @returns {object} structured debate transcript
   */
  run() {
    const startTime = Date.now();

    this.#log('='.repeat(72));
    this.#log('  MULTI-AGENT DEBATE SOCIETY');
    this.#log('  HoloScript Headless Demo #1 — Door 1 Adoption Proof');
    this.#log('='.repeat(72));
    this.#log(`  Topic: "${this.topic}"`);
    this.#log(`  Agents: ${this.agents.map(a => a.name).join(', ')}`);
    this.#log(`  Moderator: ${this.moderator.name}`);
    this.#log(`  Rounds: ${this.rounds}`);
    this.#log(`  Protocol: PROPOSE -> ARGUE -> REBUT -> VOTE`);
    this.#log('='.repeat(72));
    this.#log('');

    // ---- SETUP ----
    this.moderator.announcePhase(DebatePhase.SETUP, { topic: this.topic, rounds: this.rounds });
    this.#recordTranscript(DebatePhase.SETUP, this.moderator.id, `Debate initialized. Topic: "${this.topic}". ${this.agents.length} agents. ${this.rounds} round(s).`);

    for (let round = 1; round <= this.rounds; round++) {
      this.#log(`\n${'_'.repeat(72)}`);
      this.#log(`  ROUND ${round} of ${this.rounds}`);
      this.#log(`${'_'.repeat(72)}\n`);

      // ---- PROPOSE ----
      this.moderator.announcePhase(DebatePhase.PROPOSE, { round });
      this.#log(`--- PHASE: PROPOSE (Round ${round}) ---\n`);
      for (const agent of this.agents) {
        const proposal = agent.propose(this.topic);
        this.#log(`[${agent.name}] ${proposal}\n`);
        this.#recordTranscript(DebatePhase.PROPOSE, agent.id, proposal, { round });
      }

      // ---- ARGUE ----
      this.moderator.announcePhase(DebatePhase.ARGUE, { round });
      this.#log(`--- PHASE: ARGUE (Round ${round}) ---\n`);
      for (const agent of this.agents) {
        const argument = agent.argue(this.topic);
        this.#log(`[${agent.name}] ${argument}\n`);
        this.#recordTranscript(DebatePhase.ARGUE, agent.id, argument, { round });
      }

      // ---- REBUT ----
      this.moderator.announcePhase(DebatePhase.REBUT, { round });
      this.#log(`--- PHASE: REBUT (Round ${round}) ---\n`);
      for (const agent of this.agents) {
        const rebuttal = agent.rebut(this.topic);
        this.#log(`[${agent.name}] ${rebuttal}\n`);
        this.#recordTranscript(DebatePhase.REBUT, agent.id, rebuttal, { round });
      }

      // ---- VOTE ----
      this.moderator.announcePhase(DebatePhase.VOTE, { round });
      this.#log(`--- PHASE: VOTE (Round ${round}) ---\n`);
      const candidates = this.agents.map(a => ({ id: a.id, name: a.name }));
      const votes = [];
      for (const agent of this.agents) {
        const vote = agent.vote(candidates);
        const votedName = candidates.find(c => c.id === vote.votedFor)?.name ?? vote.votedFor;
        this.#log(`[${agent.name}] votes for ${votedName}: ${vote.reason}\n`);
        this.#recordTranscript(DebatePhase.VOTE, agent.id, vote.reason, {
          round,
          votedFor: vote.votedFor,
        });
        votes.push({ votedFor: vote.votedFor, voter: agent.id });
      }

      // Tally
      const result = this.moderator.tallyVotes(votes);
      const winnerName = result.winner
        ? this.agents.find(a => a.id === result.winner)?.name ?? result.winner
        : 'TIE';
      this.#log(`--- VOTE RESULT (Round ${round}) ---`);
      this.#log(`Tally: ${JSON.stringify(result.tally)}`);
      this.#log(`Winner: ${winnerName}\n`);
      this.#recordTranscript(DebatePhase.VOTE, this.moderator.id,
        `Round ${round} result: ${winnerName}`, { tally: result.tally, winner: result.winner });
    }

    // ---- SUMMARY ----
    this.moderator.announcePhase(DebatePhase.SUMMARY);
    const durationMs = Date.now() - startTime;

    this.#log('='.repeat(72));
    this.#log('  DEBATE CONCLUDED');
    this.#log('='.repeat(72));
    this.#log(`  Duration: ${durationMs}ms`);
    this.#log(`  Messages exchanged: ${this.bus.getHistory().length}`);
    this.#log(`  Violations: ${(this.moderator.knowledge.get('violations') ?? []).length}`);
    this.#log('');

    // Build structured output
    const output = this.#buildOutput(durationMs);

    // Print JSON transcript
    this.#log('\n--- STRUCTURED JSON TRANSCRIPT ---\n');
    this.#log(JSON.stringify(output, null, 2));

    return output;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE
  // ---------------------------------------------------------------------------

  #log(msg) {
    if (this.verbose) console.log(msg);
  }

  #recordTranscript(phase, agentId, content, metadata = {}) {
    this.transcript.push({
      phase,
      agentId,
      agentName: agentId === this.moderator.id
        ? this.moderator.name
        : this.agents.find(a => a.id === agentId)?.name ?? agentId,
      content,
      timestamp: Date.now(),
      ...metadata,
    });
  }

  #buildOutput(durationMs) {
    return {
      meta: {
        demo: 'multi-agent-debate-society',
        version: '1.0.0',
        holoscript_patterns: [
          'BroadcastChannel (AgentMessage.to = "broadcast")',
          '@knowledge trait (AgentState.knowledge persistent Map)',
          'Phase protocol (AgentPhase turn-based transitions)',
          'PWG knowledge format (Pattern/Wisdom/Gotcha)',
        ],
        door: 'Door 1 — Headless Adoption (no spatial rendering)',
        timestamp: new Date().toISOString(),
        durationMs,
      },
      debate: {
        topic: this.topic,
        rounds: this.rounds,
        agents: this.agents.map(a => ({
          id: a.id,
          name: a.name,
          perspective: a.perspective,
        })),
        moderator: {
          id: this.moderator.id,
          name: this.moderator.name,
          rules: this.moderator.knowledge.get('rules'),
        },
      },
      transcript: this.transcript,
      knowledge_state: {
        agents: Object.fromEntries(
          this.agents.map(a => [a.id, a.knowledge.toJSON()])
        ),
        moderator: this.moderator.knowledge.toJSON(),
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
          // Omit full payload for brevity; include summary
          payloadSummary: m.payload?.content
            ? m.payload.content.slice(0, 80) + (m.payload.content.length > 80 ? '...' : '')
            : JSON.stringify(m.payload).slice(0, 80),
        })),
      },
      violations: this.moderator.knowledge.get('violations') ?? [],
      vote_tally: this.moderator.knowledge.get('vote_tally') ?? {},
      wisdom_extracted: [
        {
          id: 'W.DEBATE.01',
          domain: 'multi-agent',
          insight: 'Structured turn-based protocols prevent agent cross-talk and ensure all perspectives are heard before voting.',
          source: 'debate-society-demo',
          tags: ['debate', 'protocol', 'turn-based'],
          createdAt: Date.now(),
        },
        {
          id: 'W.DEBATE.02',
          domain: 'broadcast-channels',
          insight: 'Broadcast channels with topic-based subscriptions enable loose coupling between agents while maintaining message ordering.',
          source: 'debate-society-demo',
          tags: ['broadcast', 'channels', 'messaging'],
          createdAt: Date.now(),
        },
        {
          id: 'P.DEBATE.01',
          domain: 'multi-agent',
          problem: 'Agents need persistent memory across debate phases',
          solution: '@knowledge trait with Map-based store persists arguments, opponent tracking, and votes across all phases',
          tags: ['knowledge', 'persistence', 'memory'],
          confidence: 0.95,
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
  let topic = 'Should AI systems be granted legal personhood?';
  let rounds = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      topic = args[i + 1];
      i++;
    } else if (args[i] === '--rounds' && args[i + 1]) {
      rounds = Math.max(1, Math.min(5, parseInt(args[i + 1], 10) || 1));
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Multi-Agent Debate Society — HoloScript Headless Demo #1

Usage:
  node debate-society.mjs [options]

Options:
  --topic <string>   Set the debate topic (default: "Should AI systems be granted legal personhood?")
  --rounds <number>  Number of debate rounds, 1-5 (default: 1)
  --help, -h         Show this help message

Examples:
  node debate-society.mjs
  node debate-society.mjs --topic "Open source vs proprietary software"
  node debate-society.mjs --rounds 2 --topic "Is consciousness computable?"

HoloScript Patterns Demonstrated:
  - BroadcastChannel    Agent-to-agent pub/sub messaging (AgentMessage.to = 'broadcast')
  - @knowledge trait    Persistent per-agent memory across debate phases
  - Phase protocol      Turn-based PROPOSE -> ARGUE -> REBUT -> VOTE
  - PWG format          Wisdom/Pattern/Gotcha knowledge extraction
  - Moderator agent     Rule enforcement and vote tallying
`);
      process.exit(0);
    }
  }

  const orchestrator = new DebateOrchestrator({ topic, rounds });
  const result = orchestrator.run();

  // Exit with success
  process.exit(0);
}

main();
