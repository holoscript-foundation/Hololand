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
