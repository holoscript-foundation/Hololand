# HoloShell Absorption Pilots

**Status:** Phase 1 research
**Date:** 2026-05-12
**Scope:** Browser, local project/CLI, and legacy app classification pilots

## Pilot Selection

Phase 1 should run three pilots in this order:

1. Browser operation.
2. Local project/CLI operation.
3. Legacy app classification and one document/system-app path.

These cover the three most important absorption modes:

- structured external surface,
- deterministic local command surface,
- messy old-world app surface.

## Pilot 1: Browser Operation

### Why First

The browser is the highest-value legacy machine. It touches accounts, web apps,
docs, dashboards, admin consoles, payments, social surfaces, and public research.
It also has good witness paths: URL, DOM snapshot, screenshot, network context,
and visible user session boundary.

### Capability Object

```text
id: browser-operator
sourceKind: browser
adapter: browser_automation
trustState: partial
permissionEnvelope: guarded_write
receiptTypes:
  - browser_action_receipt
  - screenshot_witness
  - dom_witness
visualForm: machine
replacementPath: wrap_then_reimagine
```

### First Outcome Flow

```text
Intent: "Check whether this service is healthy."
Plan: open target, inspect visible status, collect witness, summarize.
Risk: may use browser profile/session; name the boundary.
Action: browser automation.
Receipt: URL, timestamp, screenshot path, DOM summary, agent id.
```

### Risks

- Private sessions and cookies.
- Web pages changing shape.
- Prompt injection in page text.
- Automation acting on wrong tab/profile.

### Controls

- Require named browser profile boundary.
- Treat page content as untrusted input.
- Keep screenshots local unless explicitly shared.
- Use read-only first; require approval for forms, payments, deletes, messages,
  account changes, or downloads.

## Pilot 2: Local Project/CLI Operation

### Why Second

This is where Codex is already strongest as hardware anchor. The user should not
run commands; HoloShell should turn command work into visible local outcomes.

### Capability Object

```text
id: cli-dev-stack
sourceKind: cli
adapter: process_spawn
trustState: partial
permissionEnvelope: guarded_execute
receiptTypes:
  - command_receipt
  - build_receipt
  - git_diff_receipt
visualForm: machine
replacementPath: hide_under_intent_flow
```

### First Outcome Flow

```text
Intent: "Check this project and tell me if it is safe."
Plan: inspect repo state, run focused check, summarize pass/fail, show receipt.
Risk: command execution, possible generated files.
Action: spawn safe known script with timeout.
Receipt: command, cwd, exit code, duration, stdout/stderr tail, changed files.
```

### Risks

- Commands mutate the tree.
- Package scripts can run arbitrary code.
- Long builds can spike memory or GPU.
- Output can contain secrets.

### Controls

- Known-script allowlist for silent execution.
- Break-glass for install, delete, credential, network publish, deploy, and
  global environment changes.
- Timeout and resource budget.
- Redact env and known secret patterns from receipts.

## Pilot 3: Legacy App Classification

### Why Third

Raw installed-app inventory is not a product. It is intimidating and private.
HoloShell should classify app capabilities into useful machine groups.

### Capability Object

```text
id: legacy-apps
sourceKind: app
adapter: windows_registry_inventory
trustState: partial
permissionEnvelope: classified_per_app
receiptTypes:
  - legacy_app_action_receipt
  - manual_witness_when_automation_unavailable
visualForm: machine_gallery
replacementPath: wrap_then_reimagine
```

### First Outcome Flow

```text
Intent: "What can my installed apps help agents do?"
Plan: classify programs into capability groups, hide private names by default,
      expose unknowns as unknown, propose safe adapter path.
Risk: local inventory privacy.
Action: registry inventory and archetype grouping.
Receipt: inventory timestamp, counts, archetypes, redaction mode.
```

### Risks

- Exposing private installed-app names.
- Treating installed apps as safe.
- UI Automation misreading app state.
- System settings mutations damaging the host.

### Controls

- Redacted summary first.
- Per-app classification before operation.
- UI Automation and vision are last resort.
- System settings require break-glass approval and rollback.

## Visual Reimagination Targets

| Old surface | HoloShell form | Agent action model |
| --- | --- | --- |
| Browser tab | Browser Machine | Inspect, read, fill, submit, witness |
| Terminal | Command Machine | Plan, execute, summarize, receipt |
| Folder | Project Room | Inspect, diff, build, archive |
| Excel/document app | Document Machine | Extract, transform, summarize, export |
| Windows Settings | System Machine | Inspect only by default; mutation is break-glass |
| Unknown installed app | Unclassified Machine | Classify before action |

## Research Findings

- UI Automation is viable as a fallback because Windows exposes a normalized
  automation tree for many desktop UI elements, but it should not be the first
  path when APIs or CLIs exist.
- DSC-style declarative state is a better mental model for system changes than
  "click settings panels"; HoloShell should explain desired state, diff, and
  rollback before mutation.
- Browser automation needs a named session boundary. A real user's browser
  profile is powerful and should be treated like a credential-bearing machine.
- Tauri is a good desktop-host candidate for HoloShell because it can combine a
  web-rendered product surface with a local host bridge, but the canonical
  behavior must stay in HoloScript.

## Open Questions

1. Should HoloShell store per-user capability preferences locally or in HoloMesh?
2. Which receipt fields are mandatory before an agent can mark an outcome done?
3. How should HoloShell show "I can do this, but I should not do it silently"?
4. Which app categories should be hidden from default non-developer view?
5. When does a wrapped legacy workflow graduate into a HoloScript-native
   replacement?

