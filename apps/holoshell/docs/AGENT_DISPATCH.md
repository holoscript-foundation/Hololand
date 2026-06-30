# HoloShell Agent Dispatch

Agent Dispatch is Brittney's first operator router. It turns plain-language
requests into existing guarded HoloShell adapters.

Examples:

```text
Brittney, open terminal, start a sovereign room marathon for local-tagged tasks, open a browser, and play lofi music on YouTube
launch Codex locally
start a sovereign room marathon for local-tagged tasks
start a sovereign room marathon for cloud-tagged tasks
open Excel
open browser and play lofi music on YouTube
```

Runtime contract:

```text
apps/holoshell/source/holoshell-agent-dispatch.hsplus
scripts/holoshell-agent-dispatch.mjs
```

The dispatch script writes:

```text
.tmp/holoshell/agent-dispatch-latest.json
.tmp/holoshell/agent-dispatch-latest.js
.tmp/holoshell/agent-dispatches/
```

The daemon route is:

```text
POST /workflow/agent-dispatch
```

Dispatch is not an execution path. It selects a route and body, then the daemon
hands off to the selected existing adapter:

```text
/workflow/founder-command
/workflow/room-marathon
/workflow/laptop-reasoning-job
/action
```

That downstream adapter remains responsible for the workflow/action receipt,
nonce-bound approval bundle, and final user-approved execution.
