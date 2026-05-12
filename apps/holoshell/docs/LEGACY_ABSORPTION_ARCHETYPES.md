# Legacy Absorption Archetypes

HoloShell treats legacy software as capability engines, not as the user's
primary mental model. This document classifies the first absorption paths
without committing any private local app inventory.

## Classification Rule

Each legacy program or workflow becomes a HoloScript-visible capability object:

```text
program/workflow -> capability manifest -> adapter -> permission envelope -> receipt -> visual form
```

Trust comes from the adapter path, not from the fact that the program exists.

## Archetypes

| Archetype | First adapter | Permission envelope | Receipt expectation | Visual form | Replacement path |
| --- | --- | --- | --- | --- | --- |
| Native API or MCP service | HTTP/MCP/native SDK | `network_read_then_tool_auth` or service-specific scope | Health response plus tool/action receipt | Room or glyph | Preserve as source/runtime substrate |
| CLI and PowerShell workflow | `process_spawn` with timeout and cwd | `guarded_execute` | Command, args hash, cwd, exit code, stdout/stderr tail | Machine | Hide under intent flow |
| Browser or web app | Browser automation with profile boundary | `guarded_write` | Screenshot, DOM witness, URL, action plan | Machine | Wrap, then replace repeated workflows |
| Document or creative workbench | Native API if available; file conversion or CLI next; UI Automation fallback | `classified_per_app` | File snapshot, action witness, output artifact hash | Legacy machine | Keep as engine until workflow is HoloScript-native |
| Windows settings and system utilities | PowerShell/WMI/registry/service APIs | `high_risk_break_glass` | Before/after snapshot, approval id, rollback plan | Approval object or system machine | Preserve with strict policy |
| Opaque GUI-only program | UI Automation, screen witness, or manual witness | `break_glass_or_manual` | Visual witness and operator attribution | Disputed machine | Avoid automation until safer adapter exists |

## First Product Interpretation

The Local Capability Room should not show a raw installed-app list. It should
group legacy software by what it can do:

- Documents and reports.
- Browser operations.
- Build and local project operations.
- Creative and spatial runtime operations.
- System settings and services.
- Unknown programs awaiting classification.

Unknown is acceptable. Hidden authority is not.

## Trust Defaults

| Adapter path | Default trust | Why |
| --- | --- | --- |
| HoloScript MCP or signed HoloLand MCP | `verified` when health and auth pass | Tool schema and service identity are known. |
| Local CLI with deterministic command receipt | `partial` | The process ran locally, but command semantics may still be broad. |
| Browser automation | `partial` | DOM and screenshot witnesses help, but the web page can change. |
| Native desktop API | `partial` until app-specific policy exists | API may be powerful and underspecified. |
| UI Automation or vision fallback | `unknown` or `disputed` | The agent may misread UI state; approvals and witnesses matter. |
| System settings or registry mutation | `unsafe` until approved | A small change can break the host. |

## Non-Developer UX Rule

Do not present the user with adapter names first. Present the intended outcome,
the acting agent, the risk, and the receipt path.

Bad:

```text
Run powershell.exe with these args?
```

Good:

```text
Codex wants to change a Windows service setting. Risk is high. A before/after
snapshot and rollback command will be recorded.
```

## Upstream Gaps

These should graduate to HoloScript when the first bridge stabilizes:

- Canonical `Capability` schema and validator.
- Canonical adapter contract for API, CLI, browser, UI Automation, and vision.
- Cross-receipt relation model for hardware, tool, browser, and app witnesses.
- Permission envelope trait family for local operating-system actions.

