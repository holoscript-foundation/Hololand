# Holo* Ecosystem Integration Guide

**Version:** 2.0  
**Status:** Complete Architecture Reference  
**Last Updated:** February 3, 2026  
**Scope:** HoloAgent, HoloBrain, HoloVM, HoloIntegrate, HoloMesh

---

## 🎯 Ecosystem Overview

The Holo* ecosystem is a **unified spatial computing platform** built on the **8-Phase Agent Protocol**.

```
┌─────────────────────────────────────────────────────────┐
│                  HOLO* ECOSYSTEM                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  HoloScript (Language Layer)                            │
│  └─ Spatial UI definition & compilation                │
│                                                         │
│  Hololand (Runtime Layer)                              │
│  ├─ DOM2D Renderer                                     │
│  ├─ Network Orchestration                             │
│  └─ Composition Management                            │
│                                                         │
│  Agent Layer (Intelligence)                            │
│  ├─ HoloAgent (Base Agent Pattern)                    │
│  ├─ HoloBrain (Knowledge Storage)                     │
│  ├─ HoloVM (Execution Engine)                        │
│  └─ HoloIntegrate (System Integration)               │
│                                                         │
│  Infrastructure Layer                                  │
│  ├─ HoloMesh (Network Topology)                       │
│  ├─ Railway (Deployment)                              │
│  └─ Database (Persistence)                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🤖 HoloAgent - Base Agent Pattern

**Purpose:** Abstract base class implementing the 8-Phase Agent Protocol for all agents in the ecosystem.

### Architecture

```typescript
// BaseAgent implements 8-phase agent protocol
abstract class BaseAgent {
  // Phase 1: INTAKE - Accept new task
  abstract async intake(objective: Objective): Promise<void>
  
  // Phase 2: REFLECT - Analyze objective
  abstract async reflect(): Promise<Analysis>
  
  // Phase 3: EXECUTE - Implement solution
  abstract async execute(): Promise<Result>
  
  // Phase 4: COMPRESS - Extract learnings
  abstract async compress(): Promise<Compressed>
  
  // Phase 5: REINTAKE - Absorb learnings
  abstract async reintake(compressed: Compressed): Promise<void>
  
  // Phase 6: GROW - Expand capabilities
  abstract async grow(): Promise<CapabilityMap>
  
  // Phase 7: EVOLVE - Self-improvement
  abstract async evolve(): Promise<void>
  
  // Phase 8: AUTONOMIZE - Generate next autonomous actions
  abstract async autonomize(): Promise<NextActions>
  
  // Unified Objective (defined per agent)
  protected unifiedObjective: string = ""  // Set by implementation
}
```

### 8-Phase Protocol Implementation

**Phase 1: INTAKE**
- Accept new objective
- Validate requirements
- Request context from HoloBrain
- Initialize execution plan

```typescript
async intake(objective: Objective): Promise<void> {
  this.currentObjective = objective
  this.context = await this.brain.query(objective.domain)
  this.executionPlan = this.planExecution(objective)
  this.state = "INTAKE_COMPLETE"
}
```

**Phase 2: REFLECT**
- Analyze objective deeply
- Identify dependencies
- Check for conflicts
- Propose approach

```typescript
async reflect(): Promise<Analysis> {
  const analysis = {
    objectives: this.currentObjective,
    dependencies: await this.identifyDependencies(),
    risks: await this.assessRisks(),
    approach: await this.proposeApproach(),
    estimatedEffort: await this.estimateEffort()
  }
  this.state = "REFLECT_COMPLETE"
  return analysis
}
```

**Phase 3: EXECUTE**
- Implement solution
- Run execution plan
- Monitor progress
- Adapt to issues

```typescript
async execute(): Promise<Result> {
  const result = {
    success: false,
    output: null,
    metrics: {},
    errors: []
  }
  
  try {
    for (const step of this.executionPlan) {
      const stepResult = await this.executeStep(step)
      result.metrics[step.name] = stepResult.metrics
      result.output = stepResult.output
    }
    result.success = true
  } catch (error) {
    result.errors.push(error)
    await this.adaptToIssue(error)
  }
  
  this.state = "EXECUTE_COMPLETE"
  return result
}
```

**Phase 4: COMPRESS**
- Extract key learnings
- Compress knowledge
- Identify patterns
- Create summary

```typescript
async compress(): Promise<Compressed> {
  return {
    learnings: await this.extractLearnings(),
    patterns: await this.identifyPatterns(),
    bestPractices: await this.synthesizePractices(),
    summary: this.generateSummary(),
    metrics: this.aggregateMetrics()
  }
}
```

**Phase 5: REINTAKE**
- Absorb own compressed learnings
- Update internal models
- Refresh memory
- Prepare for next cycle

```typescript
async reintake(compressed: Compressed): Promise<void> {
  await this.brain.storeCompressed(compressed)
  this.internalModels = await this.updateModels(compressed)
  this.workingMemory = await this.refreshMemory()
  this.state = "REINTAKE_COMPLETE"
}
```

**Phase 6: GROW**
- Expand capabilities
- Learn new skills
- Integrate feedback
- Build new patterns

```typescript
async grow(): Promise<CapabilityMap> {
  return {
    newSkills: await this.learnNewSkills(),
    expandedKnowledge: await this.expandKnowledge(),
    improvedMethods: await this.improveMethods(),
    betterPatterns: await this.synthesizePatterns()
  }
}
```

**Phase 7: EVOLVE**
- Self-improvement
- Architecture updates
- System optimization

```typescript
async evolve(): Promise<void> {
  await this.optimizeArchitecture()
  await this.updateSystems()
  await this.refineBehavior()
  this.state = "EVOLVE_COMPLETE"
}
```

**Phase 8: AUTONOMIZE**
- Generate autonomous next actions
- Self-directed task generation
- Create pipeline for future cycles
- Zero-instruction operation

```typescript
async autonomize(): Promise<NextActions> {
  const nextActions = {
    suggestedObjectives: await this.generateObjectives(),
    autonomousTasks: await this.planNextCycle(),
    scheduledWork: await this.createSchedule(),
    priorities: await this.rankByImpact()
  }
  
  this.state = "AUTONOMIZE_COMPLETE"
  return nextActions
}
```

### Agent Objectives

Each agent defines its own objective at initialization. Objectives should be:
- **Clear:** Unambiguous success criteria
- **Measurable:** Quantifiable outcomes
- **Achievable:** Realistic within constraints
- **Aligned:** Consistent with ecosystem goals

Execution follows the 8-phase protocol consistently regardless of objective.

---

## 🧠 HoloBrain - Knowledge Storage

**Purpose:** Distributed knowledge base for all agents in the ecosystem.

### Architecture

```
HoloBrain
├─ Episodic Memory (Past events & experiences)
├─ Semantic Memory (Facts, concepts, relationships)
├─ Procedural Memory (How-to, skills, patterns)
├─ Working Memory (Current task context)
└─ Long-term Evolution (Compressed learnings)
```

### Core Functions

```typescript
interface HoloBrain {
  // Storage
  store(domain: string, knowledge: Knowledge): Promise<string>
  storeCompressed(compressed: Compressed): Promise<void>
  
  // Retrieval
  query(domain: string, pattern?: Pattern): Promise<Knowledge[]>
  findSimilar(knowledge: Knowledge): Promise<Knowledge[]>
  getContext(objective: Objective): Promise<Context>
  
  // Updates
  update(id: string, knowledge: Knowledge): Promise<void>
  incrementRelevance(id: string, delta: number): Promise<void>
  
  // Reasoning
  reason(query: string): Promise<Reasoning>
  synthesize(domain: string): Promise<Synthesis>
  
  // Collective
  publishToMesh(knowledge: Knowledge): Promise<void>
  subscribeToUpdates(domain: string): AsyncIterator<Update>
}
```

### Knowledge Structure

```typescript
interface Knowledge {
  id: string
  domain: string
  category: "fact" | "procedure" | "pattern" | "learning"
  content: {
    title: string
    description: string
    metadata: Record<string, any>
  }
  source: {
    agent: string
    timestamp: Date
    context: Context
  }
  relevance: {
    score: number
    frequency: number
    lastAccessed: Date
  }
  relationships: {
    dependsOn: string[]
    enables: string[]
    conflictsWith: string[]
  }
}
```

### Integration Pattern

```typescript
// HoloAgent uses HoloBrain
class MyAgent extends BaseAgent {
  constructor(private brain: HoloBrain) {
    super()
  }
  
  async reflect(): Promise<Analysis> {
    // Query similar past tasks
    const pastExperiences = await this.brain.query("task_execution")
    
    // Get domain context
    const context = await this.brain.getContext(this.currentObjective)
    
    // Reason about approach
    const reasoning = await this.brain.reason(
      `How should I approach: ${this.currentObjective.description}`
    )
    
    return { pastExperiences, context, reasoning }
  }
  
  async compress(): Promise<Compressed> {
    // Extract learnings
    const learnings = this.extractInsights()
    
    // Store in HoloBrain for future agents
    await this.brain.storeCompressed({
      learnings,
      patterns: this.patterns,
      bestPractices: this.practices
    })
    
    return learnings
  }
}
```

---

## ⚙️ HoloVM - Execution Engine

**Purpose:** Virtual machine for executing spatial computations and agent tasks.

### Architecture

```
HoloVM
├─ Instruction Decoder
├─ Execution Context
├─ Memory Management
├─ State Machine
└─ Resource Scheduler
```

### Execution Model

```typescript
interface HoloVM {
  // Load and compile
  compile(code: HoloScript): Bytecode
  load(bytecode: Bytecode): ExecutionContext
  
  // Execution
  execute(context: ExecutionContext): Promise<void>
  step(context: ExecutionContext): Promise<void>
  
  // Control
  pause(context: ExecutionContext): Promise<void>
  resume(context: ExecutionContext): Promise<void>
  stop(context: ExecutionContext): Promise<void>
  
  // Monitoring
  getState(context: ExecutionContext): VMState
  getMetrics(context: ExecutionContext): Metrics
  
  // Resource management
  allocateMemory(size: number): MemoryBlock
  freeMemory(block: MemoryBlock): void
  scheduleTask(task: Task, priority: number): void
}
```

### Task Execution Example

```typescript
// Agent submits task to HoloVM
const task = {
  type: "render_ui",
  payload: {
    holoScript: `
      spatial Dashboard {
        element Text("Hello")
      }
    `
  }
}

const context = vm.load(vm.compile(task.payload.holoScript))
const result = await vm.execute(context)

// Result includes rendered output
const output = {
  dom2d: result.renderedDOM,
  metrics: {
    executionTime: 125,
    memoryUsed: 2048,
    instructionsExecuted: 5420
  }
}
```

---

## 🔗 HoloIntegrate - System Integration

**Purpose:** Unified interface for integrating external systems (databases, APIs, services).

### Architecture

```
HoloIntegrate
├─ Connector Interface
├─ Protocol Handlers
├─ Authentication
├─ Rate Limiting
└─ Error Handling
```

### Integration Pattern

```typescript
interface Connector {
  // Connection
  connect(config: ConnectorConfig): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  
  // Operations
  query(sql: string): Promise<any[]>
  execute(command: string): Promise<ExecutionResult>
  subscribe(event: string): AsyncIterator<Event>
  
  // Transactions
  beginTransaction(): Promise<Transaction>
  commit(tx: Transaction): Promise<void>
  rollback(tx: Transaction): Promise<void>
}

// Built-in connectors
class DatabaseConnector extends Connector { }
class APIConnector extends Connector { }
class FileSystemConnector extends Connector { }
class ServiceConnector extends Connector { }
```

### Usage in Agents

```typescript
class DataProcessingAgent extends BaseAgent {
  async execute(): Promise<Result> {
    // Connect to external systems
    const db = await integrate.connect("postgresql", dbConfig)
    const api = await integrate.connect("rest_api", apiConfig)
    
    // Execute integrated operations
    const data = await db.query("SELECT * FROM users")
    const enriched = await api.execute("/enrich", { data })
    
    // Store results
    await db.execute("INSERT INTO results (...) VALUES (...)")
    
    return { success: true, output: enriched }
  }
}
```

---

## 🕸️ HoloMesh - Network Topology

**Purpose:** Distributed peer-to-peer network connecting all agents and services.

### Architecture

```
HoloMesh
├─ Node Registry
├─ Message Router
├─ Event Broker
├─ Consensus System
└─ Network Health Monitor
```

### Network Model

```typescript
interface HoloMesh {
  // Registration
  registerNode(agent: BaseAgent, metadata: NodeMetadata): Promise<NodeId>
  unregisterNode(id: NodeId): Promise<void>
  
  // Discovery
  findNodes(selector: NodeSelector): Promise<Node[]>
  watchNodes(selector: NodeSelector): AsyncIterator<NodeEvent>
  
  // Communication
  send(to: NodeId, message: Message): Promise<void>
  broadcast(message: Message, selector?: NodeSelector): Promise<void>
  
  // Events
  emit(event: Event): Promise<void>
  subscribe(pattern: string): AsyncIterator<Event>
  
  // Queries
  query(pattern: string): Promise<any>
  aggregate(pattern: string): Promise<AggregationResult>
  
  // Health
  getHealth(): MeshHealth
  getNodeHealth(id: NodeId): NodeHealth
}
```

### Agent Communication Example

```typescript
// Agent 1 publishes a discovery
const agent1 = new MyAgent()
const nodeId = await mesh.registerNode(agent1, {
  name: "DataProcessor",
  domain: "data_processing",
  capabilities: ["query", "transform", "analyze"]
})

// Agent 2 discovers and communicates
const agent2 = new MyAgent()
const nodes = await mesh.findNodes({
  domain: "data_processing",
  capability: "transform"
})

// Send request
const result = await mesh.send(nodes[0].id, {
  type: "REQUEST_TRANSFORM",
  payload: { data: myData }
})
```

### Knowledge Broadcasting

```typescript
// When an agent compresses knowledge, broadcast to mesh
const agent = new MyAgent()
const compressed = await agent.compress()

await mesh.emit({
  type: "KNOWLEDGE_UPDATE",
  domain: "data_processing",
  source: agent.id,
  payload: compressed
})

// Other agents subscribe to updates
mesh.subscribe("data_processing/*").on("data", (event) => {
  console.log("Received update from", event.source)
  // Integrate new knowledge
})
```

---

## 🏗️ Ecosystem Workflows

### Workflow 1: Task Execution Across Agents

```
1. Client submits objective
2. Orchestrator (Hololand) broadcasts to HoloMesh
3. Multiple agents offer capabilities (HoloMesh.findNodes)
4. Orchestrator selects best agent
   ↓
5. Agent starts 8-phase protocol:
   - INTAKE: Accept objective
   - REFLECT: Analyze with HoloBrain context
   - EXECUTE: Use HoloVM for computations
   - COMPRESS: Extract learnings
   - REINTAKE: Store in HoloBrain
   - GROW: Expand capabilities
   - EVOLVE: Self-improvement
   - AUTONOMIZE: Generate next autonomous actions
   ↓
6. Agent publishes results
7. Other agents subscribe (HoloMesh.subscribe)
8. Collective knowledge grows (HoloBrain)
```

### Workflow 2: Spatial UI Rendering

```
1. HoloScript source (.holo file)
2. HoloScript compiler (lexer → parser → codegen)
3. HoloVM loads compiled bytecode
4. HoloVM executes rendering instructions
5. DOM2D Renderer generates HTML/CSS
6. Browser renders to user
7. Events bubble back (click, input, etc)
8. HoloVM processes events
9. State updates trigger re-rendering
```

### Workflow 3: Distributed Knowledge Growth

```
Agent A:
- Completes task
- Compress learnings
- Store in HoloBrain
- Publish to HoloMesh
   ↓
HoloMesh broadcasts
   ↓
Agent B:
- Subscribe to updates
- Receive Agent A's compressed knowledge
- REINTAKE: Absorb learnings
- GROW: Expand based on new knowledge
- EVOLVE: Improve capabilities
```

---

## 💡 Design Principles

### 1. Separation of Concerns

- **HoloAgent:** Intelligence & decision making
- **HoloBrain:** Knowledge storage & retrieval
- **HoloVM:** Execution & computation
- **HoloIntegrate:** External system access
- **HoloMesh:** Communication & discovery

### 2. Infinite Evolution

Each cycle builds on previous learnings:
```
Cycle 1: Task → Execute → Learn → Compress
  ↓
Cycle 2: Reintake learnings → Better tools → Execute → Learn
  ↓
Cycle 3: More knowledge → Better decisions → Execute → Learn
  ↓
... (exponential improvement)
```

### 3. Collective Intelligence

- All agents share knowledge through HoloBrain
- Discoveries broadcast through HoloMesh
- Collective memory grows with each agent contribution
- Ecosystem becomes more capable over time

### 4. Explicit Over Implicit

- All phases of uAA2++ protocol are explicit
- Clear state transitions
- Auditable decision making
- Debuggable execution

---

## 🔧 Development Patterns

### Pattern 1: Creating a Custom Agent

```typescript
import { BaseAgent } from '@holo/agent'
import { HoloBrain } from '@holo/brain'

class MyCustomAgent extends BaseAgent {
  private brain: HoloBrain
  
  constructor(brain: HoloBrain) {
    super()
    this.brain = brain
    this.unifiedObjective = this.unifiedObjective // Inherit
  }
  
  async intake(objective: Objective): Promise<void> {
    // Custom intake logic
    this.currentObjective = objective
    this.context = await this.brain.query(objective.domain)
  }
  
  // Implement all 7 phases...
}

// Usage
const brain = new HoloBrain()
const agent = new MyCustomAgent(brain)
await agent.intake(myObjective)
```

### Pattern 2: Integrating External Data

```typescript
class DataIntegrationAgent extends BaseAgent {
  private integrate: HoloIntegrate
  
  async execute(): Promise<Result> {
    // Connect to external database
    const db = await this.integrate.connect("postgresql", {
      host: "localhost",
      database: "my_data"
    })
    
    // Query data
    const data = await db.query("SELECT * FROM users")
    
    // Process with HoloVM
    const processed = await this.vm.execute(processingBytecode, data)
    
    // Store results in HoloBrain
    await this.brain.store("data", {
      title: "Processed User Data",
      content: processed
    })
    
    return { success: true, data: processed }
  }
}
```

---

## 📊 Version History

**v2.0 (Current - Feb 2026):**
- Complete HoloAgent base class
- Seven-phase protocol fully documented
- HoloBrain with semantic search
- HoloVM with spatial execution
- HoloIntegrate with connectors
- HoloMesh with peer-to-peer networking

**v1.5 (2025):**
- Initial agent patterns
- Basic knowledge storage
- Execution framework

**v1.0 (2024):**
- Architecture design
- Conceptual framework

---

## 🔗 Related Projects

- **HoloScript:** Spatial UI language
- **Hololand:** Runtime environment
- **mcp-orchestrator:** Multi-service orchestration
- **TrainingMonkey:** Educational agent
- **infinitus-monorepo:** Distributed systems

---

**Last Updated:** February 3, 2026  
**Status:** Production Ready  
**Maintained By:** Holo* Team
