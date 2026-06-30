# HoloShell Legacy App Adapter Matrix

**Status:** Research matrix
**Date:** 2026-05-13
**Scope:** First legacy apps and surfaces Brittney should operate
**Pairs with:** `HARDWARE_PROGRAM_CONTROL.md`, `SHELL_OBJECT_SCHEMA.md`

## Purpose

HoloShell must control existing software on the hardware. It should not do that
by blindly clicking windows. Each app category gets a preferred adapter path,
permission envelope, witness requirement, and replacement path.

Adapter order:

```text
Native API or file format
MCP or service API
CLI or PowerShell
Browser automation
UI Automation accessibility tree
Screenshot plus OCR
Manual witness
```

The safest adapter wins, not the flashiest one.

## Adapter Matrix

| Surface | First use case | Preferred adapter | Fallback | Envelope | Receipt |
| --- | --- | --- | --- | --- | --- |
| Browser | Open page, play media, inspect status | Browser automation with named profile boundary | URL open plus screenshot witness | `guarded_execute` for opening, `break_glass` for forms/payments | URL, screenshot, DOM summary, profile boundary |
| YouTube/media | Play lofi or requested media | Browser URL open with media intent | Manual witness if autoplay blocked | `guarded_execute` | URL, page title, playback witness if available |
| Terminal | Start local command or sovereign room workflow | CLI/process spawn with cwd and timeout | UI Automation type/hotkey | `guarded_execute` | command hash, cwd, exit code or staged input receipt |
| Local room lane | Start room marathon or task lane | HoloMesh room scripts if available | Terminal typing workflow | `guarded_execute` | task tag, prompt hash, lane id, run receipt |
| Excel/spreadsheets | Open workbook, read/transform/export | File parser or Office automation | UI Automation plus screenshot witness | `guarded_execute` for mutation, `read_only` for parse | file snapshot, sheet summary, output hash |
| Documents | Read, summarize, redline, export | Document parser/converter | App automation | `guarded_execute` for writes | file snapshot, diff, output artifact |
| File Explorer | Open folder, reveal file, organize | Filesystem API | UI Automation | `read_only` inspect, `break_glass` delete/move outside workspace | path receipt, diff, rollback note |
| Project folder | Check build/test state | Known script through run wrapper | Raw shell only with reason | `guarded_execute` | run receipt, git diff, output tail |
| System settings | Inspect or change machine state | Declarative PowerShell/DSC-style plan | UI Automation only as witness | `break_glass` for mutation | before/after, rollback, approval id |
| Unknown app | Classify capability | Registry and window metadata | Manual classification | `classified_per_app` | redacted app classification receipt |

## Browser Boundary

The browser is credential-bearing. HoloShell must name the boundary before an
agent uses it:

- Which browser.
- Which profile or temporary profile.
- Whether cookies/session state may be used.
- Whether screenshots stay local.
- Whether the page is treated as untrusted input.

Opening public media is guarded. Forms, purchases, messages, account changes,
downloads, and uploads are break-glass unless an app-specific policy narrows the
risk.

## Excel And Document Boundary

Excel and document apps are important because they represent work, not just UI.
HoloShell should prefer file-level operation before UI-level operation.

Preferred flow:

```text
Identify file -> snapshot -> parse -> propose transformation -> approve write -> export -> receipt
```

UI Automation should be reserved for features that cannot be expressed through
file formats, APIs, or converters.

## Terminal Boundary

Terminal operation is powerful. The shell should never silently type and submit
unbounded commands.

Default terminal workflow:

1. Resolve terminal and command target.
2. Stage command as a workflow object.
3. Mint workflow approval bundle.
4. Require explicit approval and execute-enabled daemon.
5. Record run receipt and visible outcome.

The current `Room Marathon with Lofi` workflow is the first proof of this
pattern.

## Adapter Graduation

A wrapped workflow graduates when it is repeated enough to justify a
HoloScript-native object.

| Repetition signal | Graduation path |
| --- | --- |
| Same browser steps repeated | Browser Machine recipe. |
| Same terminal command repeated | HoloShell workflow source. |
| Same spreadsheet transformation repeated | HoloScript document/spreadsheet intent. |
| Same settings change repeated | Declarative system-state object. |
| Same app UI path repeated | Captured control graph with stable adapter. |

## Build Order

1. Browser media and page inspection.
2. Terminal and sovereign room workflows.
3. Excel or spreadsheet file read/summary/export.
4. File/project safe check flow.
5. System settings inspect-only view.
6. UI Automation invoke path for one captured legacy app.

This order keeps the product useful while staying inside receipts and approval
boundaries.
