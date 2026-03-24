# Headless Demos — HoloScript Door 1 Adoption

Standalone demos that prove HoloScript value **without spatial rendering**.
These run as pure Node.js scripts with no 3D dependencies, demonstrating
that HoloScript's agent communication, knowledge persistence, and protocol
patterns are valuable independently of VR/AR.

## Demo #1: Multi-Agent Debate Society

Three AI agents engage in structured debate using HoloScript's broadcast
channels and `@knowledge` persistent memory trait.

### Quick Start

```bash
# Default topic and 1 round
node examples/headless/debate-society.mjs

# Custom topic
node examples/headless/debate-society.mjs --topic "Open source vs proprietary software"

# Multiple rounds
node examples/headless/debate-society.mjs --rounds 2 --topic "Is consciousness computable?"
```

### HoloScript Patterns Demonstrated

| Pattern | HoloScript Source | Demo Implementation |
|---------|-------------------|---------------------|
| **BroadcastChannel** | `AgentMessage.to = 'broadcast'` (`AgentTypes.ts`) | In-process pub/sub event bus with topic channels |
| **@knowledge trait** | `AgentState.knowledge` Map (`AgentTypes.ts`) | `KnowledgeStore` class with persistent append log |
| **Phase protocol** | `AgentPhase` enum (`agent-protocol`) | Turn-based `PROPOSE -> ARGUE -> REBUT -> VOTE` |
| **PWG format** | `Pattern/Wisdom/Gotcha` (`agent-protocol`) | Extracted wisdom in W/P/G format in JSON output |
| **Moderator agent** | `AgentCategory: 'orchestrator'` | Rule enforcement, violation tracking, vote tallying |

### Architecture

```
debate-society.mjs          Runnable Node.js script (zero dependencies)
debate-society.hsplus       HoloScript composition (reference syntax)
```

The `.mjs` file is the executable demo. The `.hsplus` file shows the same
architecture expressed in native HoloScript syntax for reference.

### Output

The demo produces:
1. **Console output** — human-readable debate transcript
2. **Structured JSON** — machine-readable transcript with:
   - Full debate transcript with phases and timestamps
   - Per-agent knowledge state (arguments, rebuttals, opponent tracking)
   - Broadcast message log with channel attribution
   - Vote tally and winner determination
   - Extracted wisdom in PWG format

### Agents

| Agent | Perspective | Debate Style |
|-------|------------|--------------|
| Dr. Pragma | Pragmatist | Evidence-based, measurable outcomes, cost-benefit |
| Prof. Ideal | Idealist | Values-driven, ethical principles, long-term vision |
| The Skeptic | Skeptic | Falsification, epistemic humility, Bayesian reasoning |

### Door 1 Adoption Value

This demo proves that HoloScript's core abstractions — broadcast channels,
knowledge persistence, agent protocols — provide value for **any**
multi-agent system, not just VR/AR. Potential headless use cases:

- Multi-agent decision-making systems
- Structured negotiation protocols
- Knowledge extraction pipelines
- Agent-to-agent communication testing
- Protocol design and validation

## Demo #2: Agent Swarm Task Decomposition

A coordinator agent decomposes a complex task into subtasks, then 5 worker
agents claim subtasks based on skill tags, execute in parallel waves, and
report results back through broadcast channels for final aggregation.

### Quick Start

```bash
# Default task (web scraping pipeline)
node examples/headless/task-swarm.mjs

# Custom task
node examples/headless/task-swarm.mjs --task "Design a REST API"

# Fewer workers
node examples/headless/task-swarm.mjs --workers 3 --task "Build a recommendation engine"
```

### HoloScript Patterns Demonstrated

| Pattern | HoloScript Source | Demo Implementation |
|---------|-------------------|---------------------|
| **BroadcastChannel** | `AgentMessage.to = 'broadcast'` (`AgentTypes.ts`) | 5 channels: coordinator, tasks, claims, progress, results |
| **@autonomous trait** | `AgentState.autonomous` (`TraitTypes.ts`) | Workers self-direct task claiming based on skill matching |
| **@knowledge trait** | `AgentState.knowledge` Map (`AgentTypes.ts`) | Per-agent persistent memory across execution waves |
| **Skill routing** | `AgentCapability.skills` (`agent-protocol`) | Task assignment by skill-tag overlap scoring |
| **Wave scheduling** | `AgentPhase` parallel execution | Dependency-aware DAG scheduling in parallel waves |
| **Result aggregation** | `AgentCategory: 'orchestrator'` | Coordinator merges outputs with critical path analysis |

### Architecture

```
task-swarm.mjs          Runnable Node.js script (zero dependencies)
task-swarm.hsplus       HoloScript composition (reference syntax)
```

### Workers

| Worker | Specialization | Skills |
|--------|---------------|--------|
| Alpha (Architect) | System design | architecture, documentation, monitoring |
| Beta (Network Eng) | Connectivity | networking, security, concurrency |
| Gamma (Data Eng) | Data pipelines | data-processing, storage, parsing |
| Delta (QA Lead) | Quality assurance | testing, monitoring, documentation |
| Epsilon (Full-Stack) | General purpose | networking, data-processing, architecture |

### Output

The demo produces:
1. **Console output** -- human-readable task tree, wave execution, and aggregation
2. **Structured JSON** -- machine-readable output with:
   - Full task tree with dependencies, skill requirements, and status
   - Per-wave execution timeline with worker assignments
   - Aggregated results with critical path analysis and parallel speedup
   - Per-agent knowledge state (claims, completions, progress)
   - Broadcast message log across 5 channels
   - Extracted wisdom in PWG format

## Demo #3: Knowledge Graph Builder

Three specialized agents collaboratively build a knowledge graph from
unstructured text: an entity extractor, a relationship mapper, and a
conflict resolver that uses trust scoring for contradiction handling.

### Quick Start

```bash
# Default corpus (3 rounds about Einstein and the Institute for Advanced Study)
node examples/headless/knowledge-graph.mjs

# Fewer rounds
node examples/headless/knowledge-graph.mjs --rounds 2

# Custom text input
node examples/headless/knowledge-graph.mjs --input "Marie Curie discovered radium at the University of Paris."
```

### HoloScript Patterns Demonstrated

| Pattern | HoloScript Source | Demo Implementation |
|---------|-------------------|---------------------|
| **BroadcastChannel** | `AgentMessage.to = 'broadcast'` (`AgentTypes.ts`) | 4 channels: coordinator, entities, relationships, conflicts |
| **@knowledge trait** | `AgentState.knowledge` Map (`AgentTypes.ts`) | Persistent graph state across extraction rounds |
| **CRDT-like merge** | `AgentState` conflict resolution | Trust-weighted node/edge merging for contradictions |
| **Multi-agent collab** | `AgentCategory` pipeline | Extract -> Map -> Resolve agent pipeline per round |
| **Trust scoring** | `AgentReliability` weighting | Per-agent trust scores weight conflict resolution |
| **Incremental build** | `AgentPhase` multi-round | Graph grows and refines with each round of text |

### Architecture

```
knowledge-graph.mjs     Runnable Node.js script (zero dependencies)
knowledge-graph.hsplus  HoloScript composition (reference syntax)
```

### Agents

| Agent | Role | Responsibility |
|-------|------|----------------|
| Entity Extractor | Extraction | Identifies people, orgs, places, concepts, temporal markers |
| Relationship Mapper | Mapping | Finds connections (born_in, developed, friends_with, etc.) |
| Conflict Resolver | Resolution | Deduplicates nodes, resolves contradictions, flags low confidence |

### Conflict Resolution Strategies

| Conflict Type | Strategy | Description |
|---------------|----------|-------------|
| Duplicate nodes | Merge higher confidence | Alias matching detects duplicates; higher-confidence node absorbs the other |
| Contradictory edges | Trust-weighted selection | Agent trust score x assertion confidence determines winner |
| Low confidence | Retain with flag | Entries below 0.60 threshold flagged for future corroboration |

### Output

The demo produces:
1. **Console output** -- human-readable entity/relationship extraction per round
2. **Structured JSON** -- machine-readable output with:
   - Complete knowledge graph (nodes with types/aliases, edges with relations)
   - Confidence scores on all nodes and edges
   - Conflict log with detection type and resolution strategy
   - Per-round extraction log showing graph growth
   - Per-agent knowledge state
   - Broadcast message log across 4 channels
   - Extracted wisdom in PWG format (including a gotcha about alias matching)

## Door 1 Adoption Value (All Demos)

These demos collectively prove that HoloScript's core abstractions provide
value for **any** multi-agent system, not just VR/AR:

- **Demo #1**: Structured debate with turn-based protocols
- **Demo #2**: Task decomposition with skill-based parallel execution
- **Demo #3**: Knowledge graph construction with CRDT-like conflict resolution

Potential headless use cases beyond these demos:
- Multi-agent decision-making and negotiation systems
- Autonomous task planning and execution pipelines
- Knowledge extraction and graph building from unstructured data
- Agent-to-agent communication testing and protocol validation
- Distributed coordination with conflict resolution
