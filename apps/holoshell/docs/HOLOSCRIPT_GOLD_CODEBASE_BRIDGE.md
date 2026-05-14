# HoloScript GOLD Codebase Bridge

HoloShell should not invent around assets it already has. This bridge makes
GOLD memory and HoloScript codebase intelligence visible as one local,
read-only substrate for Brittney and the shell object graph.

Runtime contract:

```text
apps/holoshell/source/holoshell-holoscript-gold-codebase-bridge.hsplus
scripts/holoshell-holoscript-gold-codebase-bridge.mjs
```

Generated receipts:

```text
.tmp/holoshell/holoscript-gold-codebase-bridge.json
.tmp/holoshell/holoscript-gold-codebase-bridge.js
```

What it wires:

```text
GOLD Drive           read-only memory, gotchas, patterns, wisdom, override policy
HoloScript codebase  graph-status, absorb, query, ask, semantic search, impact
Surface map          REST, MCP, CLI, and room projections already discovered
Format inventory     .holo worlds, .hs render/pipeline slices, .hsplus behavior
Wild HoloScript      uAA2 frontier source waiting for adapters
```

Brittney use rule:

```text
Before proposing a new feature, adapter, or trusted-autonomy upgrade, ask:
1. Which GOLD entry changes the plan?
2. Which HoloScript codebase tool or trait already exists?
3. Is the graph cache fresh enough?
4. Which format owns the work: .holo, .hs, or .hsplus?
5. What approval boundary remains before autonomy?
```

Execution policy:

```text
GOLD is read-only by default.
holo_graph_status runs before absorb.
holo_absorb_repo defaults to force=false.
Queries are read-only.
Force absorb, private data extrusion, deployment, credentials, and mutation stay guarded.
```

This is the bridge from "we have a lot" to "HoloShell uses what we have."
