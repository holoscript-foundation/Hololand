# Wild HoloScript Intake

**Status:** Product bridge
**Source:** `apps/holoshell/source/holoshell-wild-holoscript-intake.hsplus`
**Runtime bridge:** `scripts/holoshell-wild-holoscript-intake.mjs`

`uaa2-service` is not just another repo to clean up. It is a wild HoloScript
compatibility corpus: `.holo` worlds, `.hs` display modules, `.hsplus` behavior
contracts, host imports, data bindings, state machines, and component syntax
that HoloShell should learn to display and promote.

The rule is simple: scan read-only, preserve the useful weirdness, then promote
through adapters and receipts. Do not normalize the corpus into generic YAML or
plain dashboard data.

## Run

```powershell
node scripts/holoshell-wild-holoscript-intake.mjs
```

Outputs:

- `.tmp/holoshell/wild-holoscript-intake.json`
- `.tmp/holoshell/wild-holoscript-intake.js`
- `window.HOLOSHELL_WILD_HOLOSCRIPT_INTAKE`

Override the source checkout when needed:

```powershell
node scripts/holoshell-wild-holoscript-intake.mjs --uaa2-root C:\Users\josep\Documents\GitHub\uaa2-service
```

## File Roles

| Format | HoloShell use |
| --- | --- |
| `.holo` | Displayable world/source fixture. Use it to prove that `.hs` modules can be embedded and rendered by `.holo` scenes. |
| `.hs` | Visible component or module slice. Promote into shell widgets, geometry modules, and render helpers. |
| `.hsplus` | Behavior, agent, state-machine, orchestration, policy, and host integration source. Promote only through explicit adapters. |

## First Promotions

| Source | Target | Why it matters |
| --- | --- | --- |
| `src/services/spatial/scripts/terminal-integration.hsplus` | Command bubble | Terminal is an OS object, not just a text backend. |
| `src/worlds/innovation/agent-orchestration.hsplus` | Agent Lab surface | Shows wild world/data_binding/@for/@if orchestration syntax HoloShell should learn. |
| `src/holoscript/agents/brittney.hsplus` | Brittney avatar runtime lane | Carries AGI-facing state-machine semantics into the assistant surface. |
| `src/worlds/innovation/_lib/components/*.hsplus` | Shell widget library | Gives HoloShell native geometric UI pieces instead of one dashboard skin. |
| `.holo` worlds such as therapy sessions | World fixtures | Proves HoloShell can display HoloScript worlds and embedded modules. |

## Safety

The intake lane never executes wild source. It records:

- extension counts
- syntax signals
- compatibility bands
- adapter-needed files
- frontier syntax files
- canonical candidates
- flagship promotion map

Execution, mutation, app control, and world import stay behind the existing
guarded HoloShell approval lanes.
