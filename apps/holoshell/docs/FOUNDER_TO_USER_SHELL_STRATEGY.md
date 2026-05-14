# Founder To User HoloShell Strategy

**Status:** Product strategy
**Source:** `apps/holoshell/source/holoshell-founder-to-user-strategy.hsplus`
**Related:** `apps/holoshell/docs/WILD_HOLOSCRIPT_INTAKE.md`

HoloShell should be built as the founder version first, then broken down into
the user version.

That matters because the founder version is where the whole OS-replacement
vision can stay intact: HoloLand boots, the screen becomes a liquid HoloScript
world, Brittney is present as the operator, apps/files/browser/terminal/agents
become objects, skins change the whole interaction field, and hardware actions
move through receipts. Starting from the user version first would bias the
product toward a safe launcher and lose the weird power that makes it HoloShell.

## Version Split

| Layer | Founder HoloShell | User HoloShell |
| --- | --- | --- |
| Shell surface | Full liquid OS, source corpus, wild adapters, receipt underlay, debug controls | Curated home world with programs, files, browser, agents, approvals, and safe skins |
| Brittney | AGI/operator with local context, agent orchestration, policy explanation, and hardware proposal powers | Assistant with clear commands, confirmations, accessibility, and scoped action packets |
| Programs | Raw app/window/process capture, terminal control, browser automation, legacy UI wrapping | App bubbles, guarded launches, reversible workflows, simplified app-control receipts |
| Formats | All `.holo`, `.hs`, `.hsplus` features exposed for discovery and promotion | A compatibility subset compiled into stable capability packs |
| Skins | Liquid, fire, aura, developer, experimental materials, geometry reconstruction, VFX labs | Accessible skin presets with performance and contrast budgets |
| Risk | Founder can see raw power but execution still requires receipts and gates | Dangerous actions hidden behind stronger guardrails or absent entirely |

## Build Order

1. Build Founder HoloShell as the full vision surface.
2. Inventory `.holo`, `.hs`, and `.hsplus` as separate capability lanes.
3. Promote wild modules only through adapters and receipts.
4. Derive user capability packs from the founder surface.
5. Keep user mode beautiful and calm, but never let it define the ceiling.

## Format Strategy

| Format | Founder use | User use |
| --- | --- | --- |
| `.holo` | Whole-shell world graph, skins, first screen, embedded source fixtures, legacy UI geometry | Stable home world, safe launch bubbles, approved skins |
| `.hs` | Core scripts, render slices, pipelines, hardware action plans, receipts, compact geometry proofs | Readable automation, imports, health checks, reversible workflows |
| `.hsplus` | Brittney runtime, state machines, agent orchestration, policies, data binding, host adapters | Product behavior, assistant flows, approvals, multiplayer state, app wrappers |

## Hard Rules

- User HoloShell is derived from Founder HoloShell, not designed as a separate
  small product.
- Wild source is scanned read-only until an adapter and receipt path exist.
- `.holo` and `.hs` are first-class HoloShell inputs, not footnotes under
  `.hsplus`.
- Hardware control always keeps permission envelopes and receipts.
- The founder surface may expose raw detail; the user surface must turn that
  detail into understandable objects and choices.
