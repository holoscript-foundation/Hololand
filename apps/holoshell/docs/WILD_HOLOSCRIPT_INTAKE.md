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

## uaa2-service Seed Gate

The archived `Hololand uaa2-service Integration` seed is now promoted as a
source-first gate, not a direct backend integration plan. The current contract
is:

```text
archive seed -> HoloScript gate source -> read-only wild intake ->
adapter-required promotion map -> receipt -> learning signal
```

Source: `apps/holoshell/source/holoshell-uaa2-service-seed-gate.hsplus`
Bridge: `scripts/holoshell-uaa2-service-seed-gate.mjs`

Run:

```powershell
node scripts/holoshell-uaa2-service-seed-gate.mjs --uaa2-root C:\Users\josep\Documents\GitHub\uaa2-service
```

The seed can teach HoloLand prompt-to-HoloScript builder flows and agent-service
boundaries. It does not authorize importing `uaa2-service` internals, executing
wild source, or treating payment/singularity examples as current runtime scope.

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
| `.holo` | World graph, shell composition, skin surface, spatial group, inline pipeline, object-template, and embedded-module host. In Founder HoloShell, this owns the whole computer-as-world view. In user HoloShell, it becomes the curated home surface and safe world fixture layer. |
| `.hs` | Compact core script: data pipelines, render slices, modules, geometry proofs, launch plans, and receipt-friendly local jobs. In Founder HoloShell, this can expose raw machine workflows. In user HoloShell, it becomes the readable, reversible automation lane. |
| `.hsplus` | Behavior/runtime source: Brittney, agents, state machines, data binding, events, policies, orchestration, and host integration. In Founder HoloShell, this is the AGI/operator layer. In user HoloShell, it is filtered through adapters, approval packets, and product-safe capability packs. |

The intake receipt now records `formatProfiles` so `.holo`, `.hs`, and
`.hsplus` each keep their own feature inventory. This prevents the scanner from
treating `.holo` worlds and `.hs` scripts as just weaker `.hsplus` files.

## Format Feature Inventory

The scanner records these HoloShell-relevant feature families:

| Format | Feature families |
| --- | --- |
| `.holo` | `composition_root`, `world_root`, `metadata_block`, `environment_block`, `spatial_group`, `template_system`, `object_graph`, `trait_decorators`, `state_blocks`, `state_machine`, `action_blocks`, `event_handlers`, `panel_ui`, `inline_pipeline`, `pipeline_*`, `geometry_nodes`, `material_nodes`, `post_processing`, `data_binding`, `control_flow`, `audio_config`, `permission_receipts`, `skin_effects` |
| `.hs` | `pipeline_root`, `pipeline_source`, `pipeline_transform`, `pipeline_filter`, `pipeline_validate`, `pipeline_merge`, `pipeline_branch`, `pipeline_sink`, `schedule`, `module_system`, `template_system`, `object_graph`, `environment_block`, `light_nodes`, `geometry_nodes`, `material_nodes`, `animation_nodes`, `post_processing`, `host_api_bridge`, `permission_receipts`, `skin_effects`, `hardware_shell_control` |
| `.hsplus` | `composition_root`, `world_root`, `module_system`, `template_system`, `object_graph`, `trait_decorators`, `state_blocks`, `state_machine`, `action_blocks`, `event_handlers`, `panel_ui`, `agent_runtime`, `data_binding`, `control_flow`, `networked_object`, `audio_config`, `host_api_bridge`, `holoscript_imports`, `host_runtime_imports`, `permission_receipts`, `skin_effects`, `hardware_shell_control` |

This is deliberately broader than parser-success. Wild source is useful because
it shows product grammar before the adapters are all mature.

## Founder Version Then User Version

HoloShell should be built founder-first, then carved down into a user version.
The founder version is the unrestricted vision surface: liquid OS, raw source
corpus, hardware wrappers, Brittney as operator, skins, agent rooms, and deep
receipts. The user version is not a smaller dream; it is a packaged subset with
safer defaults, clearer actions, accessibility guarantees, and fewer raw knobs.

Source contract: `apps/holoshell/source/holoshell-founder-to-user-strategy.hsplus`
and `apps/holoshell/docs/FOUNDER_TO_USER_SHELL_STRATEGY.md`.

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
